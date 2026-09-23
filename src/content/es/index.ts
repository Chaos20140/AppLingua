import type { CourseContent } from '../types';
import { meta } from './meta';
import { stages } from './stages';
import { exams } from './exams';
import { placement } from './placement';
import { grammar } from './grammar/index';
import { pronCategories, pronItems } from './pronunciation';
import { scenarios } from './scenarios';
import s0l01 from './lessons/s0l01';
import s0l02 from './lessons/s0l02';
import s0l03 from './lessons/s0l03';
import s0l04 from './lessons/s0l04';
import s0l05 from './lessons/s0l05';
import s0l06 from './lessons/s0l06';
import s0l07 from './lessons/s0l07';
import s0l08 from './lessons/s0l08';
import s0l09 from './lessons/s0l09';
import s0l10 from './lessons/s0l10';
import s0l11 from './lessons/s0l11';
import s0l12 from './lessons/s0l12';
import s0l13 from './lessons/s0l13';
import s0l14 from './lessons/s0l14';
import a1l01 from './lessons/a1l01';
import a1l02 from './lessons/a1l02';
import a1l03 from './lessons/a1l03';
import a1l04 from './lessons/a1l04';

const content: CourseContent = {
  meta, stages, exams, placement, grammar, pronCategories, pronItems, scenarios,
  lessons: [s0l01, s0l02, s0l03, s0l04, s0l05, s0l06, s0l07, s0l08, s0l09, s0l10, s0l11, s0l12, s0l13, s0l14, a1l01, a1l02, a1l03, a1l04],
};

export default content;
