import type { GrammarTopic } from '../../types';
import sounds from './sounds';
import formality from './formality';
import pronouns from './pronouns';
import ser from './ser';
import estar from './estar';
import serEstar from './ser-estar';
import articlesGender from './articles-gender';
import plural from './plural';
import contractions from './contractions';
import presentRegular from './present-regular';
import numbers from './numbers';
import questions from './questions';
import ter from './ter';
import possessives from './possessives';
import temHaver from './tem-haver';
import adjectives from './adjectives';
import reflexive from './reflexive';
import timeDates from './time-dates';
import gerund from './gerund';

export const grammar: GrammarTopic[] = [
  sounds,
  formality,
  pronouns,
  ser,
  estar,
  serEstar,
  articlesGender,
  plural,
  contractions,
  presentRegular,
  numbers,
  questions,
  ter,
  possessives,
  temHaver,
  adjectives,
  reflexive,
  timeDates,
  gerund,
];
