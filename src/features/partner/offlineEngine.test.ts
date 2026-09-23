import { describe, expect, it } from 'vitest';
import type { Scenario, ScriptNode } from '../../content/types';
import es from '../../content/es/index';
import pt from '../../content/pt-BR/index';
import {
  detectQuestionIssues, evaluateOffline, keywordHits, looksGerman, offlineScorePct, originalWords, pickScript,
  respondOffline, startOffline, type OfflineScript,
} from './offlineEngine';

const node = (p: Partial<ScriptNode> & { id: string }): ScriptNode => ({
  partner: `P:${p.id}`, partnerGerman: `D:${p.id}`, expect: [], fallbackNext: p.id, hint: 'Hinweis', sample: `Muestra para ${p.id} con varias palabras`, ...p,
});

const scenario: Scenario = {
  id: 'es.sc.test', courseId: 'es', key: 'test', title: 'Test', emoji: '🧪', description: '', partnerRole: 'A', userRole: 'B',
  goals: [], register: 'informell',
  phrases: [{ target: '¿Qué tal?', german: 'Wie geht’s?' }, { target: 'Me llamo Ana.', german: 'Ich heiße Ana.' }],
  script: {
    informal: [
      node({ id: 'start', expect: [{ keywords: ['me llamo', 'soy'], next: 'estado', reaction: '¡Encantada!' }], fallbackNext: 'start' }),
      node({ id: 'estado', expect: [{ keywords: ['no'], next: 'triste' }, { keywords: ['si', 'bien'], next: 'fin', reaction: '¡Qué bien!' }], fallbackNext: 'fin' }),
      node({ id: 'triste', expect: [{ keywords: ['vale'], next: 'fin' }], fallbackNext: 'fin' }),
      node({ id: 'fin', end: true, sample: '¡Hasta luego!' }),
    ],
  },
};

describe('pickScript', () => {
  it('nimmt die gewünschte Fassung', () => {
    const s = pickScript(scenario, false)!;
    expect(s.register).toBe('informal');
    expect(s.fallback).toBe(false);
    expect(s.notice).toBeNull();
  });
  it('fällt auf die vorhandene Fassung zurück und weist darauf hin', () => {
    const s = pickScript(scenario, true)!;
    expect(s.register).toBe('informal');
    expect(s.requested).toBe('formal');
    expect(s.fallback).toBe(true);
    expect(s.notice).toMatch(/informellen Fassung/);
  });
  it('liefert null ohne Skript', () => {
    expect(pickScript({ id: 'x', script: {} }, false)).toBeNull();
  });
});

describe('keywordHits', () => {
  it('prüft ganze Wörter statt Teilstrings', () => {
    expect(keywordHits('Mi nombre es Ana', ['no'])).toEqual([]);
    expect(keywordHits('Casi nada', ['si'])).toEqual([]);
    expect(keywordHits('No, gracias.', ['no'])).toEqual(['no']);
    expect(keywordHits('¡Sí, claro!', ['si'])).toEqual(['si']);
  });
  it('erkennt Wortgruppen und ignoriert Akzente/Satzzeichen', () => {
    expect(keywordHits('Hola, me llamo Anna.', ['me llamo'])).toEqual(['me llamo']);
    expect(keywordHits('Más o menos…', ['mas o menos'])).toEqual(['mas o menos']);
    expect(keywordHits('', ['si'])).toEqual([]);
  });
  it('liefert Originalschreibung der Treffer', () => {
    expect(originalWords('¡Sí, me llamo Ana!', ['si', 'me llamo'])).toEqual(['sí', 'me llamo']);
  });
});

describe('respondOffline', () => {
  const script = pickScript(scenario, false) as OfflineScript;

  it('startet mit dem ersten Knoten', () => {
    const { state, lines } = startOffline(script);
    expect(state.nodeId).toBe('start');
    expect(lines).toEqual([{ kind: 'node', text: 'P:start', german: 'D:start', nodeId: 'start' }]);
  });

  it('zeigt die Reaktion zuerst, dann den nächsten Knoten', () => {
    const { state } = startOffline(script);
    const step = respondOffline(script, state, 'Hola, me llamo Tom');
    expect(step.matched).toBe(true);
    expect(step.lines.map((l) => l.kind)).toEqual(['reaction', 'node']);
    expect(step.lines[0].text).toBe('¡Encantada!');
    expect(step.state.nodeId).toBe('estado');
    expect(step.answered.id).toBe('start');
  });

  it('bei Gleichstand gewinnt die erste passende Erwartung', () => {
    let { state } = startOffline(script);
    state = respondOffline(script, state, 'soy Tom').state;
    const step = respondOffline(script, state, 'No, no muy bien');
    expect(step.state.nodeId).toBe('triste');
  });

  it('spezifischere (längere) Treffer schlagen frühere Gruppen', () => {
    const s = pickScript({
      ...scenario,
      script: {
        informal: [
          node({ id: 'q', expect: [{ keywords: ['si', 'claro'], next: 'ja' }, { keywords: ['no', 'no puedo'], next: 'nein' }], fallbackNext: 'q' }),
          node({ id: 'ja', end: true }),
          node({ id: 'nein', end: true }),
        ],
      },
    }, false) as OfflineScript;
    const { state } = startOffline(s);
    expect(respondOffline(s, state, 'Sí, pero no puedo').state.nodeId).toBe('nein');
    expect(respondOffline(s, state, 'Sí, claro').state.nodeId).toBe('ja');
    expect(respondOffline(s, state, 'No').state.nodeId).toBe('nein');
  });

  it('wiederholt den Knoten bei next == aktuellem Knoten und macht nach MAX_REPEATS weiter', () => {
    let { state } = startOffline(script);
    const a = respondOffline(script, state, 'blablabla');
    expect(a.matched).toBe(false);
    expect(a.repeated).toBe(true);
    expect(a.lines[0].repeat).toBe(true);
    state = a.state;
    state = respondOffline(script, state, 'nada').state;
    const c = respondOffline(script, state, 'otra vez nada');
    expect(c.repeated).toBe(false);
    expect(c.state.nodeId).toBe('estado');
  });

  it('nutzt fallbackNext, wenn nichts passt', () => {
    let { state } = startOffline(script);
    state = respondOffline(script, state, 'me llamo Eva').state;
    const step = respondOffline(script, state, 'perro');
    expect(step.matched).toBe(false);
    expect(step.state.nodeId).toBe('fin');
  });

  it('beendet das Gespräch nach der Antwort auf den Endknoten', () => {
    let { state } = startOffline(script);
    state = respondOffline(script, state, 'me llamo Eva').state;
    state = respondOffline(script, state, 'sí, bien').state;
    expect(state.nodeId).toBe('fin');
    const last = respondOffline(script, state, '¡Adiós!');
    expect(last.ended).toBe(true);
    expect(last.state.ended).toBe(true);
    expect(last.lines).toEqual([]);
    expect(offlineScorePct(last.state)).toBe(100);
  });

  it('beendet sauber bei unbekanntem Zielknoten', () => {
    const broken: OfflineScript = { ...script, nodes: [node({ id: 'a', expect: [{ keywords: ['x'], next: 'fehlt' }], fallbackNext: 'fehlt' })] };
    const step = respondOffline(broken, startOffline(broken).state, 'x');
    expect(step.ended).toBe(true);
  });

  it('bleibt in echten Szenarien nie hängen (auch bei unpassenden Antworten)', () => {
    for (const content of [es, pt]) {
      for (const sc of content.scenarios) {
        for (const formal of [true, false]) {
          const s = pickScript(sc, formal);
          expect(s, sc.id).not.toBeNull();
          let { state } = startOffline(s!);
          let steps = 0;
          while (!state.ended && steps < s!.nodes.length * 4) {
            state = respondOffline(s!, state, 'zzz qqq').state;
            steps++;
          }
          expect(state.ended, `${sc.id} ${formal}`).toBe(true);
        }
      }
    }
  });
});

describe('Fehlerdetektoren', () => {
  it('findet fehlende Akzente und ¿ bei spanischen Fragen', () => {
    const [issue] = detectQuestionIssues('De donde eres?', 'es');
    expect(issue.corrected).toBe('¿De dónde eres?');
    const [b] = detectQuestionIssues('Hola, como estas?', 'es');
    expect(b.corrected).toBe('Hola, ¿cómo estas?');
    expect(detectQuestionIssues('¿Cómo estás?', 'es')).toEqual([]);
  });
  it('korrigiert „¿Y tu?“ und fehlendes Fragezeichen', () => {
    expect(detectQuestionIssues('Muy bien, ¿y tu?', 'es')[0].corrected).toBe('Muy bien, ¿y tú?');
    expect(detectQuestionIssues('Dónde está el baño.', 'es')[0].corrected).toBe('¿Dónde está el baño?');
  });
  it('meldet keine Ausrufe oder Nebensätze als Fehler', () => {
    expect(detectQuestionIssues('¡Qué bien!', 'es')).toEqual([]);
    expect(detectQuestionIssues('Creo que sí.', 'es')).toEqual([]);
    expect(detectQuestionIssues('Me gusta como cocinas.', 'es')).toEqual([]);
  });
  it('Portugiesisch: por quê am Fragesatzende', () => {
    expect(detectQuestionIssues('Você não veio por que?', 'pt-BR')[0].corrected).toBe('Você não veio por quê?');
    expect(detectQuestionIssues('Por que você estuda?', 'pt-BR')).toEqual([]);
  });
  it('erkennt Deutsch statt Zielsprache', () => {
    expect(looksGerman('Ich heiße Tom')).toBe(true);
    expect(looksGerman('Hallo')).toBe(true);
    expect(looksGerman('Me llamo Tom y soy de Alemania')).toBe(false);
    expect(looksGerman('Es muy bueno')).toBe(false);
  });
});

describe('evaluateOffline', () => {
  const script = pickScript(scenario, false) as OfflineScript;

  it('wertet Gesprächsschritte, Wortschatz, Alternativen und Fehler aus', () => {
    let { state } = startOffline(script);
    const texts = ['Me llamo Eva, y tu?', 'Ich weiß nicht', '¡Adiós!'];
    for (const t of texts) state = respondOffline(script, state, t).state;
    const ev = evaluateOffline({
      courseId: 'es', scenario, script, state, userTurns: texts.map((text) => ({ text })), grammarTopicIds: ['es.g.questions'],
    });
    expect(ev.source).toBe('offline');
    expect(ev.summary).toMatch(/Einfache Offline-Auswertung/);
    expect(ev.summary).toMatch(/2 von 3/);
    expect(ev.vocabulary.used).toContain('me llamo');
    expect(ev.goodAnswers).toContain('Me llamo Eva, y tu?');
    expect(ev.grammarErrors[0].corrected).toBe('Me llamo Eva, ¿y tú?');
    expect(ev.unnatural.some((u) => u.original === 'Ich weiß nicht')).toBe(true);
    expect(ev.alternatives[0]).toBe('Muestra para estado con varias palabras');
    expect(ev.recommendedExercises.map((r) => r.route)).toContain('/grammatik/es.g.questions');
    expect(ev.recommendedExercises.map((r) => r.route)).toContain('/vokabeln');
    expect(ev.pronunciation).toBeUndefined();
    expect(ev.scores.vocabulary).toBe(67);
  });

  it('funktioniert ohne Skript (Fallback für KI-Gespräche) und kennzeichnet Aussprache ehrlich', () => {
    const ev = evaluateOffline({ courseId: 'es', scenario, userTurns: [{ text: 'Quiero una mesa para dos', voice: true }] });
    expect(ev.summary).toMatch(/nur die KI-Auswertung/);
    expect(ev.scores).toEqual({});
    expect(ev.pronunciation).toMatch(/keine phonetische Analyse/);
    expect(ev.vocabulary.suggestions.length).toBeGreaterThan(0);
    expect(ev.recommendedExercises.map((r) => r.route)).toContain('/aussprache');
  });
});
