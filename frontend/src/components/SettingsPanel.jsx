import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Trash2, X } from 'lucide-react';
import { playKeystroke } from '../lib/audioEngine';
import { validateCustomPassage } from '../lib/flowLocal';

const emptyPassage = { title: '', source: '', difficulty: 'medium', mode: 'plain', content: '' };

export default function SettingsPanel({
  settings,
  goals,
  customPassages,
  onSaveSettings,
  onSaveGoals,
  onResetSettings,
  onSavePassage,
  onDeletePassage,
  onSelectPassage,
  onClose
}) {
  const [settingsDraft, setSettingsDraft] = useState(settings);
  console.log("SettingsPanel render. props.settings:", settings, "state.settingsDraft:", settingsDraft);
  const [goalsDraft, setGoalsDraft] = useState(goals);
  const [passageDraft, setPassageDraft] = useState(emptyPassage);
  const [passageError, setPassageError] = useState('');
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  const updateSetting = (key, value) => setSettingsDraft((current) => ({ ...current, [key]: value }));
  const updateGoal = (key, value) => setGoalsDraft((current) => ({ ...current, [key]: value }));

  const handleSavePassage = (event) => {
    event.preventDefault();
    const result = validateCustomPassage(passageDraft);
    if (!result.ok) {
      setPassageError(result.error);
      return;
    }
    onSavePassage(result.passage);
    setPassageDraft(emptyPassage);
    setPassageError('');
  };

  return (
    <div className="settings-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <div className="settings-header">
          <div>
            <p className="eyebrow">Workspace controls</p>
            <h2 id="settings-title">Practice settings</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="settings-scroll">
          <section className="settings-section" aria-labelledby="reading-settings-title">
            <h3 id="reading-settings-title">Reading and rhythm</h3>
            <div className="settings-grid">
              <label>Typing size <output>{settingsDraft.typingFontSize}px</output>
                <input type="range" min="16" max="32" step="1" value={settingsDraft.typingFontSize} onChange={(event) => updateSetting('typingFontSize', Number(event.target.value))} />
              </label>
              <label>Line height <output>{Number(settingsDraft.lineHeight).toFixed(2)}</output>
                <input type="range" min="1.35" max="2.3" step="0.05" value={settingsDraft.lineHeight} onChange={(event) => updateSetting('lineHeight', Number(event.target.value))} />
              </label>
              <label>Zen idle delay <output>{(settingsDraft.zenIdleDelay / 1000).toFixed(1)}s</output>
                <input type="range" min="1000" max="10000" step="250" value={settingsDraft.zenIdleDelay} onChange={(event) => updateSetting('zenIdleDelay', Number(event.target.value))} />
              </label>
              <label>Ghost default <output>{settingsDraft.ghostDefaultWpm} WPM</output>
                <input type="range" min="25" max="180" step="5" value={settingsDraft.ghostDefaultWpm} onChange={(event) => updateSetting('ghostDefaultWpm', Number(event.target.value))} />
              </label>
              <label>Passage length
                <select value={settingsDraft.passageLength} onChange={(event) => updateSetting('passageLength', event.target.value)}>
                  <option value="any">Any length</option>
                  <option value="short">Short · under 350 chars</option>
                  <option value="medium">Medium · 350–800 chars</option>
                  <option value="long">Long · 800+ chars</option>
                </select>
              </label>
              <label>Sound pack
                <select value={settingsDraft.soundTheme || 'none'} onChange={(event) => { updateSetting('soundTheme', event.target.value); playKeystroke(event.target.value); }}>
                  <option value="none">None</option>
                  <option value="wood">Wood Block</option>
                  <option value="water">Water Drops</option>
                  <option value="thock">Mechanical Thock</option>
                </select>
              </label>
              <label>Zen visual mode
                <select value={settingsDraft.zenModeType || 'standard'} onChange={(event) => updateSetting('zenModeType', event.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="fade">Fade Mode (fade out typed text)</option>
                  <option value="blind">Blind Mode (hide upcoming text)</option>
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button type="button" className="action-primary" onClick={() => onSaveSettings(settingsDraft)}><Check className="w-4 h-4" />Save settings</button>
              <button type="button" className="action-tertiary" onClick={() => setSettingsDraft(onResetSettings())}><RotateCcw className="w-4 h-4" />Reset defaults</button>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="goal-settings-title">
            <h3 id="goal-settings-title">Daily practice goals</h3>
            <div className="settings-grid settings-grid-compact">
              <label>Minutes per day<input type="number" min="1" max="240" value={goalsDraft.dailyMinutes} onChange={(event) => updateGoal('dailyMinutes', Number(event.target.value))} /></label>
              <label>WPM target <span className="field-note">optional</span><input type="number" min="10" max="250" placeholder="—" value={goalsDraft.targetWpm ?? ''} onChange={(event) => updateGoal('targetWpm', event.target.value)} /></label>
              <label>Accuracy target <span className="field-note">optional</span><input type="number" min="50" max="100" placeholder="—" value={goalsDraft.targetAccuracy ?? ''} onChange={(event) => updateGoal('targetAccuracy', event.target.value)} /></label>
            </div>
            <div className="settings-actions"><button type="button" className="action-secondary" onClick={() => onSaveGoals(goalsDraft)}>Save goals</button></div>
          </section>

          <section className="settings-section" aria-labelledby="custom-passages-title">
            <h3 id="custom-passages-title">Custom passages</h3>
            <p className="settings-copy">Keep your own practice text local to this browser. Plain text and code are stored as text only.</p>
            <form className="custom-passage-form" onSubmit={handleSavePassage}>
              <div className="settings-grid settings-grid-compact">
                <label>Title<input value={passageDraft.title} onChange={(event) => setPassageDraft((current) => ({ ...current, title: event.target.value }))} maxLength="80" /></label>
                <label>Source<input value={passageDraft.source} onChange={(event) => setPassageDraft((current) => ({ ...current, source: event.target.value }))} maxLength="80" /></label>
                <label>Difficulty<select value={passageDraft.difficulty} onChange={(event) => setPassageDraft((current) => ({ ...current, difficulty: event.target.value }))}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                <label>Format<select value={passageDraft.mode} onChange={(event) => setPassageDraft((current) => ({ ...current, mode: event.target.value }))}><option value="plain">Plain text</option><option value="code">Code</option></select></label>
              </div>
              <label>Passage text<textarea required minLength="20" maxLength="5000" rows="5" value={passageDraft.content} onChange={(event) => setPassageDraft((current) => ({ ...current, content: event.target.value }))} /></label>
              {passageError && <p className="form-error" role="alert">{passageError}</p>}
              <button type="submit" className="action-secondary">Save local passage</button>
            </form>
            {customPassages.length > 0 && <div className="custom-passage-list">
              {customPassages.map((passage) => (
                <div className="custom-passage-row" key={passage.id}>
                  <div><strong>{passage.title}</strong><span>{passage.mode} · {passage.difficulty} · {passage.content.length} chars</span></div>
                  <div className="row-actions"><button type="button" className="action-secondary" onClick={() => onSelectPassage(passage)}>Practice</button><button type="button" className="icon-button" onClick={() => onDeletePassage(passage.id)} aria-label={`Delete ${passage.title}`}><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>}
          </section>
        </div>
      </section>
    </div>
  );
}
