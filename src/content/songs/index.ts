/**
 * Demo-Lernlieder (alle Texte und Melodien original für AppLingua erstellt).
 * Reihenfolge: Spanisch vor Portugiesisch, innerhalb der Sprache nach Niveau.
 * Aufbau und Zeitraster: siehe `./_layout.ts`.
 */
import type { Song } from '../types';
import bomDiaRio from './bom-dia-rio';
import buenosDias from './buenos-dias';
import cancionDeLluvia from './cancion-de-lluvia';
import enLaPlaza from './en-la-plaza';
import festaNoQuintal from './festa-no-quintal';
import nochesDeMadrid from './noches-de-madrid';

const songs: Song[] = [buenosDias, enLaPlaza, cancionDeLluvia, nochesDeMadrid, bomDiaRio, festaNoQuintal];

export default songs;
