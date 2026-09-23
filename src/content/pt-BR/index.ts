import type { CourseContent } from '../types';
import { meta } from './meta';
import { stages } from './stages';
import { exams } from './exams';
import { placement } from './placement';
import { grammar } from './grammar/index';
import { pronCategories, pronItems } from './pronunciation';
import { scenarios } from './scenarios';
import p0l01 from './lessons/p0l01';
import p0l02 from './lessons/p0l02';
import p0l03 from './lessons/p0l03';
import p0l04 from './lessons/p0l04';
import p0l05 from './lessons/p0l05';
import p0l06 from './lessons/p0l06';
import p0l07 from './lessons/p0l07';

const content: CourseContent = {
  meta, stages, exams, placement, grammar, pronCategories, pronItems, scenarios,
  lessons: [p0l01, p0l02, p0l03, p0l04, p0l05, p0l06, p0l07],
};

export default content;
