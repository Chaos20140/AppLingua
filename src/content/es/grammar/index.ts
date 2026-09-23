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
import { topic as prepositionsPlace } from './prepositions-place';
import { topic as imperativeTu } from './imperative-tu';
import { topic as irVenir } from './ir-venir';
import { topic as stemChange } from './stem-change';
import { topic as numbersBig } from './numbers-big';
import { topic as demonstratives } from './demonstratives';
import { topic as timeDates } from './time-dates';
import { topic as weather } from './weather';
import { topic as yoIrregular } from './yo-irregular';
import { topic as muyMucho } from './muy-mucho';
import { topic as politeRequests } from './polite-requests';

const all: GrammarTopic[] = [
  formality, alphabetSounds, stress, pronouns, ser, estar, serEstar, articles, genderPlural, adjectives,
  wordOrderNegation, presentRegular, numbers, questions, hay,
  tener, gustar, reflexive, irA, possessives,
  prepositionsPlace, imperativeTu, irVenir, stemChange, numbersBig, demonstratives, timeDates, weather, yoIrregular,
  muyMucho, politeRequests,
];

/** Alle Grammatikthemen Spanisch, sortiert nach Etappe und Reihenfolge. */
export const grammar: GrammarTopic[] = [...all].sort(
  (a, b) => STAGE_ORDER.indexOf(a.stageId) - STAGE_ORDER.indexOf(b.stageId) || a.order - b.order,
);
