/** Symbole der Song-Übungsarten (lucide-react). */
import {
  BookOpen, Blocks, Ear, Keyboard, Link2, MessageSquareQuote, MessagesSquare, Mic, Table, TextCursorInput, type LucideIcon,
} from 'lucide-react';
import type { SongExKind } from './generator';

export const KIND_ICON: Record<SongExKind, LucideIcon> = {
  cloze: TextCursorInput,
  order: Blocks,
  heard: Ear,
  match: Link2,
  verbs: Table,
  grammar: BookOpen,
  idioms: MessageSquareQuote,
  dictation: Keyboard,
  speak: Mic,
  dialogue: MessagesSquare,
};
