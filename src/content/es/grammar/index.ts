import type { GrammarTopic } from '../../types';
import { STAGE_ORDER } from '../../../core/types';
import { topic as formality } from './formality';
import { topic as alphabetSounds } from './alphabet-sounds';
import { topic as stress } from './stress';
import { topic as pronouns } from './pronouns';
import { topic as ser } from './ser';
import { topic as estar } from './estar';
import { topic as serEstar } from './ser-estar';
import { topic as articles } from './articles';
import { topic as genderPlural } from './gender-plural';
import { topic as adjectives } from './adjectives';
import { topic as wordOrderNegation } from './word-order-negation';
import { topic as presentRegular } from './present-regular';
import { topic as numbers } from './numbers';
import { topic as questions } from './questions';
import { topic as hay } from './hay';
import { topic as tener } from './tener';
import { topic as gustar } from './gustar';
import { topic as reflexive } from './reflexive';
import { topic as irA } from './ir-a';
import { topic as possessives } from './possessives';

const all: GrammarTopic[] = [
  formality, alphabetSounds, stress, pronouns, ser, estar, serEstar, articles, genderPlural, adjectives,
  wordOrderNegation, presentRegular, numbers, questions, hay,
  tener, gustar, reflexive, irA, possessives,
];

/** Alle Grammatikthemen Spanisch, sortiert nach Etappe und Reihenfolge. */
export const grammar: GrammarTopic[] = [...all].sort(
  (a, b) => STAGE_ORDER.indexOf(a.stageId) - STAGE_ORDER.indexOf(b.stageId) || a.order - b.order,
);
