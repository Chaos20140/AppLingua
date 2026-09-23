/**
 * Aussprache-Labor Brasilianisches Portugiesisch: 10 Kategorien mit Wörtern und Sätzen.
 * IPA folgt einer überregionalen brasilianischen Aussprache (Coda-R und R am Wortanfang als [h];
 * regionale Varianten stehen in den Tipps).
 */
import type { PronCategory, PronItem } from '../types';

type ItemInput = Omit<PronItem, 'id' | 'courseId' | 'categoryId'>;

const mk = (cat: string, slug: string, x: ItemInput): PronItem => ({
  id: `pt.p.${cat}.${slug}`,
  courseId: 'pt-BR',
  categoryId: `pt.pc.${cat}`,
  ...x,
});

export const pronItems: PronItem[] = [
  // ───────── Nasalvokale ─────────
  mk('nasal', 'sim', {
    text: 'sim', german: 'ja', helper: '„ßĩ“ – kurzes i durch die Nase, kein hörbares m', ipa: '[ˈsĩ]',
    syllables: ['sim'], stress: 0, level: 1, issueCodes: ['nasal'],
    mouth: 'Zunge wie beim deutschen „i“. Das Gaumensegel senkt sich, sodass die Luft **gleichzeitig durch Mund und Nase** strömt. Die Lippen schließen sich am Ende **nicht** zu einem m.',
    mistakes: ['„simm“ mit deutlich geschlossenem m am Ende', 'stimmhaftes s am Anfang wie in „Sonne“'],
    tips: ['Halte dir kurz die Nase zu: Wenn der Vokal dann dumpf klingt, war er nasal – gut so.', 'Sprich „si“ und lass den Vokal in die Nase „wandern“, bevor die Lippen sich schließen würden.'],
  }),
  mk('nasal', 'bom', {
    text: 'bom', german: 'gut', helper: '„bõ“ – o durch die Nase, Lippen bleiben am Ende offen', ipa: '[ˈbõ]',
    syllables: ['bom'], stress: 0, level: 1, issueCodes: ['nasal'],
    mouth: 'Lippen rund wie beim deutschen „o“ in „Sohn“. Die Luft strömt durch Mund **und** Nase. Das geschriebene m zeigt nur die Nasalität an – es wird nicht als eigener Laut gesprochen.',
    mistakes: ['„bomm“ wie im deutschen „Bombe“', 'offenes o wie in „Sonne“'],
    tips: ['Vergleiche mit dem französischen „bon“ – der Klang ist sehr ähnlich.', 'In `bom dia` gleitet das nasale o direkt ins „dsch“ – kein m dazwischen.'],
  }),
  mk('nasal', 'um', {
    text: 'um', german: 'ein; eins', helper: '„ũ“ – ein u durch die Nase', ipa: '[ˈũ]',
    syllables: ['um'], stress: 0, level: 1, issueCodes: ['nasal'],
    mouth: 'Lippen gerundet und vorgeschoben wie beim deutschen „u“. Gaumensegel senken, Luft durch Mund und Nase. Kein m am Ende.',
    mistakes: ['„umm“ wie im deutschen „um“', 'Verwechslung mit `uma`, wo das m hörbar ist („U-ma“)'],
    tips: ['`um` (nasal, ohne m) vs. `uma` (m beginnt eine neue Silbe und wird gesprochen).', 'Summ ein „u“ und öffne dabei den Weg durch die Nase – so entsteht „ũ“.'],
  }),
  mk('nasal', 'bem', {
    text: 'bem', german: 'gut (Adverb)', helper: '„bẽi“ – nasales e mit kurzem i-Nachklang', ipa: '[ˈbẽj̃]',
    syllables: ['bem'], stress: 0, level: 2, issueCodes: ['nasal'],
    mouth: 'Beginne mit einem geschlossenen e (wie in „See“), lass es durch die Nase klingen und gleite zu einem kurzen, ebenfalls nasalen i. Die Lippen schließen sich nicht.',
    mistakes: ['„bemm“ mit deutschem m', 'reines „be“ ohne i-Nachklang'],
    tips: ['-em am Wortende klingt fast immer wie „ẽi“: `também` ≈ „tã-BẼI“, `bem` ≈ „bẽi“.', 'Übe in `Tudo bem?` – das Wort steht dort betont am Satzende.'],
  }),
  mk('nasal', 'manha', {
    text: 'manhã', german: 'Morgen, Vormittag', helper: 'mã-„NJÃ“ – beide a nasal, Betonung am Ende', ipa: '[mɐ̃ˈɲɐ̃]',
    syllables: ['ma', 'nhã'], stress: 1, level: 2, issueCodes: ['nasal', 'nh', 'stress'],
    mouth: 'Das ã ist ein dunkles, leicht geschlossenes a (Zunge etwas höher als beim deutschen „a“), das durch die Nase klingt. `nh` = Zungenrücken am Gaumen wie bei „nj“.',
    mistakes: ['Betonung auf der ersten Silbe („MA-nja“)', 'reines, offenes deutsches a ohne Nasalierung'],
    tips: ['Die Tilde zeigt Nasalität, nicht die Betonung – hier liegt die Betonung trotzdem auf der letzten Silbe.', 'Merke `amanhã` (morgen): a-mã-NJÃ.'],
  }),
  mk('nasal', 'cinco', {
    text: 'cinco', german: 'fünf', helper: '„ßĨ-ku“ – i nasal, -o am Ende wie u', ipa: '[ˈsĩku]',
    syllables: ['cin', 'co'], stress: 0, level: 1, issueCodes: ['nasal', 'open-closed'],
    mouth: 'Stimmloses s wie in „Bus“, dann ein nasales i. Das n wird nicht als eigener Laut gesprochen – die Zunge geht direkt zum k. Das unbetonte -o am Ende ist ein kurzes u.',
    mistakes: ['„zinko“ mit summendem s', 'deutliches n und o am Ende („ßin-ko“)'],
    tips: ['c vor i/e klingt immer wie stimmloses „ß“.', 'Unbetontes -o am Wortende → „u“: cinco, quatro, oito.'],
  }),

  // ───────── -ão ─────────
  mk('ao', 'nao', {
    text: 'não', german: 'nein; nicht', helper: '„nãu“ – wie „nau“, aber durch die Nase', ipa: '[ˈnɐ̃w̃]',
    syllables: ['não'], stress: 0, level: 1, issueCodes: ['ao', 'nasal'],
    mouth: 'Starte mit einem dunklen, leicht geschlossenen a und gleite zu einem kurzen u – beides **durch die Nase**. Am Ende kein m und kein n.',
    mistakes: ['„nau“ ganz ohne Nase', '„naon“ oder „nam“ mit hörbarem Konsonanten am Ende'],
    tips: ['Sag „nau“ und halte dabei kurz die Nase zu – es muss dumpf und summend klingen.', 'Übe in Reihe: não – pão – mão – são.'],
  }),
  mk('ao', 'pao', {
    text: 'pão', german: 'Brot', helper: '„pãu“', ipa: '[ˈpɐ̃w̃]',
    syllables: ['pão'], stress: 0, level: 1, issueCodes: ['ao', 'nasal'],
    mouth: 'p ohne Behauchung (weicher als im Deutschen), dann nasales „ãu“.',
    mistakes: ['starkes deutsches „ph“ am Anfang', '„pau“ ohne Nase – das heißt „Stock, Holz“'],
    tips: ['`pão` (Brot) vs. `pau` (Stock): nur die Nase macht den Unterschied!', 'Plural: `pães` (pãis) – nicht „pões“.'],
  }),
  mk('ao', 'mao', {
    text: 'mão', german: 'Hand', helper: '„mãu“', ipa: '[ˈmɐ̃w̃]',
    syllables: ['mão'], stress: 0, level: 1, issueCodes: ['ao', 'nasal'],
    mouth: 'Lippen für m schließen, dann direkt in das nasale „ãu“ öffnen.',
    mistakes: ['„mau“ ohne Nase – `mau` heißt „schlecht, böse“'],
    tips: ['`mão` ist weiblich: `a mão` – eine wichtige Ausnahme zur -o-Regel.', 'Plural: `mãos`.'],
  }),
  mk('ao', 'estao', {
    text: 'estão', german: 'sie sind / ihr seid (gerade)', helper: 'is-„TÃU“ – e am Anfang wie kurzes i', ipa: '[isˈtɐ̃w̃]',
    syllables: ['es', 'tão'], stress: 1, level: 2, issueCodes: ['ao', 'stress', 's-x'],
    mouth: 'Das unbetonte e am Wortanfang wird zu einem kurzen i. Betonung klar auf der letzten Silbe mit nasalem „ãu“.',
    mistakes: ['Betonung auf „ES“', '„es-ta-o“ in drei Silben'],
    tips: ['Umgangssprachlich oft nur `tão`: „Eles tão em casa.“', 'In Rio klingt das s wie „sch“: „isch-TÃU“.'],
  }),
  mk('ao', 'falam', {
    text: 'falam', german: 'sie sprechen / ihr sprecht', helper: '„FA-lãu“ – unbetontes -am wie ein schwaches -ão', ipa: '[ˈfalɐ̃w̃]',
    syllables: ['fa', 'lam'], stress: 0, level: 2, issueCodes: ['ao', 'stress'],
    mouth: 'Betonung auf der ersten Silbe. Das -am am Ende ist ein kurzer, schwacher nasaler Gleitlaut „ãu“ – kein deutsches „am“.',
    mistakes: ['„FA-lamm“ mit deutschem m', 'Betonung auf der letzten Silbe („fa-LÃU“) – die Endung -am ist nie betont'],
    tips: ['Alle Verbformen für vocês/eles enden so: falam, moram, aprendem (-em ≈ „ẽi“).', 'Betonung vorne, Nasal-Ende leise.'],
  }),
  mk('ao', 'coracao', {
    text: 'coração', german: 'Herz', helper: 'ko-ra-„ßÃU“', ipa: '[koɾaˈsɐ̃w̃]',
    syllables: ['co', 'ra', 'ção'], stress: 2, level: 3, issueCodes: ['ao', 'r', 'stress'],
    mouth: 'Das r zwischen den Vokalen ist ein kurzer Zungenschlag. `ç` ist ein stimmloses s. Betonung auf `-ção`.',
    mistakes: ['Reibe-R wie im Deutschen', '„ko-ra-zi-o“ statt einer nasalen Silbe'],
    tips: ['Wörter auf -ção werden immer auf dieser Silbe betont. Die meisten sind weiblich (a estação, a canção) – `o coração` ist eine der wenigen männlichen Ausnahmen.', 'Der Plural lautet -ções: corações.'],
  }),

  // ───────── Offene & geschlossene Vokale ─────────
  mk('open-closed', 'avo-aberto', {
    text: 'avó', german: 'Oma, Großmutter', helper: 'a-„WÓ“ – offenes o wie in „Sonne“', ipa: '[aˈvɔ]',
    syllables: ['a', 'vó'], stress: 1, level: 2, issueCodes: ['open-closed', 'stress'],
    mouth: 'Kiefer deutlich öffnen, Lippen nur leicht gerundet – wie das o in „Sonne“, aber etwas länger.',
    mistakes: ['geschlossenes o wie in „Sohn“ – dann sagst du „Opa“ (`avô`)'],
    tips: ['Akut ´ = offen: ó wie „Sonne“, é wie „Bär“.', 'Übe das Paar: avó (Oma) – avô (Opa).'],
  }),
  mk('open-closed', 'avo-fechado', {
    text: 'avô', german: 'Opa, Großvater', helper: 'a-„WO“ – geschlossenes o wie in „Sohn“', ipa: '[aˈvo]',
    syllables: ['a', 'vô'], stress: 1, level: 2, issueCodes: ['open-closed', 'stress'],
    mouth: 'Lippen stärker gerundet und enger, Kiefer weniger offen – wie das o in „Sohn“, aber kürzer.',
    mistakes: ['offenes o wie in „Sonne“ – dann sagst du „Oma“ (`avó`)'],
    tips: ['Zirkumflex ^ = geschlossen: ô wie „Sohn“, ê wie „See“.', 'Die Plurale `avós` / `avôs` behalten den Unterschied.'],
  }),
  mk('open-closed', 'e-aberto', {
    text: 'é', german: 'ist (von ser)', helper: '„ä“ – kurzes offenes e wie in „Bär“', ipa: '[ˈɛ]',
    syllables: ['é'], stress: 0, level: 1, issueCodes: ['open-closed'],
    mouth: 'Mund halb offen, Zunge flach – wie „ä“ in „Bär“, aber kurz und klar.',
    mistakes: ['Verwechslung mit `e` (und), das wie „i“ klingt', 'geschlossenes e wie in „See“'],
    tips: ['`é` (ist) = „ä“, `e` (und) = „i“: „Ela é alemã e eu…“ ≈ „ä“ … „i“.', 'Zwischen zwei Wörtern verbindet sich `é` oft mit dem Vokal davor: „nome é“ ≈ „no-mjä“.'],
  }),
  mk('open-closed', 'ele', {
    text: 'ele', german: 'er', helper: '„E-li“ – geschlossenes e wie in „See“, -e am Ende wie i', ipa: '[ˈeli]',
    syllables: ['e', 'le'], stress: 0, level: 1, issueCodes: ['open-closed'],
    mouth: 'Erstes e geschlossen (Lippen breit, Zunge hoch), betont. Das End-e ist unbetont und wird zu einem kurzen i.',
    mistakes: ['„E-le“ mit deutlichem e am Ende', 'offenes „Ä-le“'],
    tips: ['`ele` [e] vs. `ela` [ɛ]: „E-li“ vs. „Ä-la“ – der Vokal ändert sich mit!', 'Unbetontes -e am Wortende ≈ „i“: ele, leite, noite.'],
  }),
  mk('open-closed', 'nos', {
    text: 'nós', german: 'wir', helper: '„nóss“ – offenes o wie in „Sonne“', ipa: '[ˈnɔs]',
    syllables: ['nós'], stress: 0, level: 2, issueCodes: ['open-closed', 's-x'],
    mouth: 'Kiefer offen, offenes o, am Ende ein stimmloses s.',
    mistakes: ['geschlossenes o wie in „Sohn“ – dann klingt es wie `nos` (uns, unbetont)'],
    tips: ['In Rio klingt das End-s wie „sch“: „nósch“; umgangssprachlich oft mit i-Gleitlaut: „nóis“.', 'Im Alltag hörst du statt `nós` meist `a gente`.'],
  }),

  // ───────── lh & nh ─────────
  mk('lh-nh', 'filho', {
    text: 'filho', german: 'Sohn', helper: '„FI-lju“ – lh wie „lj“ in „Familie“, als EIN Laut', ipa: '[ˈfiʎu]',
    syllables: ['fi', 'lho'], stress: 0, level: 1, issueCodes: ['lh'],
    mouth: 'Die Zungenspitze liegt unten hinter den Zähnen, der **Zungenrücken** drückt breit gegen den harten Gaumen – wie bei „lj“, aber als ein einziger, weicher Laut.',
    mistakes: ['„FIL-ho“ mit h', '„FI-lo“ ohne j-Anteil – dann klingt es wie `filo`'],
    tips: ['Sprich „Familie“ und achte auf das „lj“ – genau dieser Laut steckt in `filho`.', 'Weiblich: `filha` ≈ „FI-lja“ (Tochter) – nicht mit `fila` (Schlange) verwechseln.'],
  }),
  mk('lh-nh', 'trabalho', {
    text: 'trabalho', german: 'Arbeit; ich arbeite', helper: 'tra-„BA-lju“', ipa: '[tɾaˈbaʎu]',
    syllables: ['tra', 'ba', 'lho'], stress: 1, level: 2, issueCodes: ['lh', 'r'],
    mouth: 'tr mit kurzem Zungenschlag-r, betontes a, dann das weiche lh am Gaumen und ein kurzes u.',
    mistakes: ['Reibe-R in „tra“', '„tra-BAL-ho“ mit hörbarem h'],
    tips: ['Das r nach t ist immer ein kurzer Zungenschlag, nie ein „h“.', '`trabalho` ist Nomen (die Arbeit) und Verbform (ich arbeite).'],
  }),
  mk('lh-nh', 'mulher', {
    text: 'mulher', german: 'Frau', helper: 'mu-„LJÄ(h)“ – Betonung hinten, offenes e', ipa: '[muˈʎɛ(h)]',
    syllables: ['mu', 'lher'], stress: 1, level: 2, issueCodes: ['lh', 'open-closed', 'r'],
    mouth: 'Weiches lh am Gaumen, dann ein offenes e wie „ä“. Das r am Ende ist schwach gehaucht oder fällt im schnellen Sprechen fast weg.',
    mistakes: ['Betonung auf „MU“', 'geschlossenes e wie in „See“', 'kräftiges deutsches „-er“ am Ende'],
    tips: ['Plural: `mulheres` ≈ „mu-LJÄ-ris“.', 'In São Paulo hört man am Ende ein getipptes r, in Rio ein kratziges „ch“ – beides ist korrekt.'],
  }),
  mk('lh-nh', 'vinho', {
    text: 'vinho', german: 'Wein', helper: '„WĨ-nju“ – nh wie „nj“ in „Champagner“', ipa: '[ˈvĩɲu]',
    syllables: ['vi', 'nho'], stress: 0, level: 1, issueCodes: ['nh', 'nasal'],
    mouth: 'Das v ist ein echtes w (Oberzähne auf Unterlippe). `nh`: Zungenrücken gegen den Gaumen, Luft durch die Nase. Das i davor wird dabei leicht nasal.',
    mistakes: ['„WIN-ho“ mit h', '„WI-no“ ohne j-Anteil'],
    tips: ['Denk an „Champagner“ oder „Cognac“: dort steckt derselbe Laut.', 'Viele Brasilianer sprechen nh sehr weich, fast wie ein nasales „j“: „WĨ-ju“.'],
  }),
  mk('lh-nh', 'banheiro', {
    text: 'banheiro', german: 'Badezimmer, Toilette', helper: 'bã-„NJEI“-ru', ipa: '[bɐ̃ˈɲejɾu]',
    syllables: ['ba', 'nhei', 'ro'], stress: 1, level: 2, issueCodes: ['nh', 'nasal', 'r'],
    mouth: 'Erstes a nasal, dann `nh` am Gaumen, betontes „ei“, ein getipptes r und kurzes u.',
    mistakes: ['„ban-HEI-ro“ mit h', 'Reibe-R in „-ro“'],
    tips: ['Nützlicher Satz: `Onde fica o banheiro?` – Wo ist die Toilette?', 'r zwischen Vokalen = kurzer Zungenschlag.'],
  }),
  mk('lh-nh', 'senhora', {
    text: 'senhora', german: 'Frau (Anrede); Sie', helper: 'ßẽ-„NJÓ“-ra – offenes o', ipa: '[sẽˈɲɔɾɐ]',
    syllables: ['se', 'nho', 'ra'], stress: 1, level: 2, issueCodes: ['nh', 'open-closed', 'r'],
    mouth: 'Stimmloses s, nasales e, dann `nh` am Gaumen, ein **offenes** betontes o und ein getipptes r.',
    mistakes: ['„ze-NO-ra“ ohne j-Anteil und mit summendem s', 'geschlossenes o wie in „Sohn“'],
    tips: ['`senhor` (geschlossenes o) – `senhora` (offenes o).', 'Im Alltag oft stark verkürzt: `Sim, senhora!` ≈ „ßĩ, ßi-NJÓ-ra“.'],
  }),

  // ───────── R-Laute ─────────
  mk('r', 'rio', {
    text: 'Rio', german: 'Fluss; Rio (de Janeiro)', helper: '„HI-u“ – R am Wortanfang wie deutsches h', ipa: '[ˈhiu]',
    syllables: ['Ri', 'o'], stress: 0, level: 1, issueCodes: ['r'],
    mouth: 'Hauche kräftig aus dem Rachen wie bei einem deutschen „h“ – ganz ohne Zungenbewegung. Das -o am Ende wird zu „u“.',
    mistakes: ['gerolltes Zungenspitzen-R', 'deutsches Reibe-R („Rrio“)'],
    tips: ['Stell dir vor, du hauchst eine Brille an: „hi-u“.', 'In Rio selbst klingt es etwas kratziger (wie „ch“ in „Bach“) – beides wird verstanden.'],
  }),
  mk('r', 'carro', {
    text: 'carro', german: 'Auto', helper: '„KA-hu“ – rr wie h', ipa: '[ˈkahu]',
    syllables: ['car', 'ro'], stress: 0, level: 1, issueCodes: ['r'],
    mouth: 'Nach dem betonten a folgt ein kräftiges Hauchen aus dem Rachen, dann ein kurzes u.',
    mistakes: ['getipptes r – dann sagst du `caro` (teuer)', 'gerolltes rr wie im Italienischen'],
    tips: ['Doppel-R = h. Immer.', 'Übe das Paar: carro („KA-hu“) – caro („KA-ru“).'],
  }),
  mk('r', 'caro', {
    text: 'caro', german: 'teuer', helper: '„KA-ru“ – r als kurzer Zungenschlag', ipa: '[ˈkaɾu]',
    syllables: ['ca', 'ro'], stress: 0, level: 1, issueCodes: ['r'],
    mouth: 'Die Zungenspitze tippt **ein einziges Mal** kurz hinter die oberen Schneidezähne – wie bei einem sehr schnellen „d“.',
    mistakes: ['gehauchtes h – dann sagst du `carro` (Auto)', 'deutsches Reibe-R'],
    tips: ['Sprich schnell „ka-du“ – das d kommt dem getippten r sehr nahe.', 'Einzelnes r zwischen Vokalen ist immer getippt: caro, para, hora – ebenso nach Konsonant in derselben Silbe: Brasil, obrigado.'],
  }),
  mk('r', 'porta', {
    text: 'porta', german: 'Tür', helper: '„PÓH-ta“ – r vor Konsonant gehaucht', ipa: '[ˈpɔhtɐ]',
    syllables: ['por', 'ta'], stress: 0, level: 2, issueCodes: ['r', 'open-closed'],
    mouth: 'Offenes o, danach ein leichtes Hauchen, dann direkt das t. Das End-a ist kurz und dunkel.',
    mistakes: ['deutsches „Porta“ mit vokalisiertem R („Poata“)', 'geschlossenes o'],
    tips: ['Das R am Silbenende variiert stark: gehaucht (Rio, Nordosten), getippt (São Paulo) oder amerikanisch gebogen (Landesinneres). Alle Varianten sind korrekt.', 'Wichtig ist nur: nicht als deutsches „a“ auflösen.'],
  }),
  mk('r', 'obrigado', {
    text: 'obrigado', german: 'danke (Mann spricht)', helper: 'o-bri-„GA“-du', ipa: '[obɾiˈɡadu]',
    syllables: ['o', 'bri', 'ga', 'do'], stress: 2, level: 1, issueCodes: ['r', 'stress'],
    mouth: '`br` mit kurzem Zungenschlag-r, Betonung auf „GA“, unbetontes -o am Ende als u.',
    mistakes: ['Reibe-R in „bri“', 'Betonung auf „O“', '„-do“ statt „-du“ am Ende'],
    tips: ['r nach einem Konsonanten in derselben Silbe (br, tr, pr …) ist immer getippt.', 'Frauen sagen `obrigada` ≈ „o-bri-GA-da“.'],
  }),
  mk('r', 'falar', {
    text: 'falar', german: 'sprechen', helper: 'fa-„LA(h)“ – End-r kaum hörbar', ipa: '[faˈla(h)]',
    syllables: ['fa', 'lar'], stress: 1, level: 2, issueCodes: ['r', 'stress'],
    mouth: 'Betonung auf der letzten Silbe. Das r am Ende der Infinitive wird im Alltag nur schwach gehaucht oder ganz weggelassen.',
    mistakes: ['Betonung auf „FA“ (das wäre `fala`, er spricht)', 'kräftiges Reibe-R am Ende'],
    tips: ['Infinitive werden immer auf der letzten Silbe betont: falar, comer, abrir.', '`Vou falar` klingt im Alltag oft wie „vou fa-LA“.'],
  }),
  mk('r', 'mar', {
    text: 'mar', german: 'Meer', helper: '„MAH“ – End-r als leichter Hauch', ipa: '[ˈmah]',
    syllables: ['mar'], stress: 0, level: 2, issueCodes: ['r'],
    mouth: 'Offenes a wie in „Mann“, danach ein leichtes Hauchen aus dem Rachen – ohne Zungenbewegung. Das r darf **nicht** in einem langen deutschen „a“ verschwinden („Maa“).',
    mistakes: ['vokalisiertes deutsches R wie in „Meer“ („Maa“)', 'kräftig gerolltes Zungenspitzen-R', 'Reibe-R wie im deutschen „Rad“'],
    tips: ['Das End-r klingt regional verschieden: gehaucht in Rio und im Nordosten, getippt in São Paulo, amerikanisch gebogen im Landesinneren. Alle Varianten sind richtig.', 'Folgt ein Vokal, wird das r zum getippten r und bindet an: `mar azul` ≈ „ma-ra-SUU“.', 'Gleicher Laut am Silbenende: `porta`, `falar`, `amor`.'],
  }),

  // ───────── t/d vor i ─────────
  mk('d-t', 'tia', {
    text: 'tia', german: 'Tante', helper: '„TSCHI-a“', ipa: '[ˈtʃiɐ]',
    syllables: ['ti', 'a'], stress: 0, level: 1, issueCodes: ['d-t'],
    mouth: 'Die Zunge setzt wie bei „t“ an, löst sich aber in ein „sch“ – also ein „tsch“ wie in „Tschüss“.',
    mistakes: ['deutsches „TI-a“ mit klarem t'],
    tips: ['t + i = „tsch“, fast überall in Brasilien.', 'Im Nordosten (z. B. Recife) hörst du oft das klare t – verstehen genügt.'],
  }),
  mk('d-t', 'dia', {
    text: 'dia', german: 'Tag', helper: '„DSCHI-a“', ipa: '[ˈdʒiɐ]',
    syllables: ['di', 'a'], stress: 0, level: 1, issueCodes: ['d-t'],
    mouth: 'Wie „dsch“ in „Dschungel“: Zunge setzt wie bei d an und löst sich in ein stimmhaftes „sch“.',
    mistakes: ['deutsches „DI-a“', 'stimmloses „tsch“ – das wäre `tia`'],
    tips: ['`Bom dia` ≈ „bõ DSCHI-a“ – das häufigste Beispiel überhaupt.', 'd + i = „dsch“ (stimmhaft), t + i = „tsch“ (stimmlos).'],
  }),
  mk('d-t', 'noite', {
    text: 'noite', german: 'Nacht, Abend', helper: '„NOI-tschi“ – End-e wie i, davor „tsch“', ipa: '[ˈnojtʃi]',
    syllables: ['noi', 'te'], stress: 0, level: 2, issueCodes: ['d-t', 'open-closed'],
    mouth: 'Unbetontes -e am Wortende wird zu i – dadurch wird das t davor zu „tsch“.',
    mistakes: ['„NOI-te“ mit klarem e und t'],
    tips: ['Genauso: leite („LEI-tschi“), sete („ßÄ-tschi“), noite.', 'Boa noite ≈ „BO-a NOI-tschi“.'],
  }),
  mk('d-t', 'cidade', {
    text: 'cidade', german: 'Stadt', helper: 'ßi-„DA“-dschi', ipa: '[siˈdadʒi]',
    syllables: ['ci', 'da', 'de'], stress: 1, level: 2, issueCodes: ['d-t', 's-x', 'stress'],
    mouth: 'Stimmloses s am Anfang, Betonung auf „DA“, am Ende „dschi“: das erste d bleibt normal (vor a), das zweite wird zu „dsch“ (vor unbetontem -e).',
    mistakes: ['„zi-DA-de“ mit summendem s', 'beide d gleich aussprechen'],
    tips: ['Ein Wort, zwei d – zwei Klänge. Der folgende Vokal entscheidet.', 'Alle Wörter auf -dade: ≈ „-DA-dschi“ (verdade, universidade).'],
  }),
  mk('d-t', 'vinte', {
    text: 'vinte', german: 'zwanzig', helper: '„WĨN-tschi“', ipa: '[ˈvĩtʃi]',
    syllables: ['vin', 'te'], stress: 0, level: 1, issueCodes: ['d-t', 'nasal'],
    mouth: 'v wie w, nasales i, dann direkt „tschi“. Das n wird nicht einzeln gesprochen.',
    mistakes: ['„WIN-te“ mit deutschem n und e', 'f statt w am Anfang'],
    tips: ['Genauso: `sete` (7), `dezessete` (17): „-ßÄ-tschi“.', 'vinte e um ≈ „WĨN-tschi i ũ“.'],
  }),
  mk('d-t', 'tudo', {
    text: 'tudo', german: 'alles', helper: '„TU-du“ – hier KEIN tsch', ipa: '[ˈtudu]',
    syllables: ['tu', 'do'], stress: 0, level: 1, issueCodes: ['d-t'],
    mouth: 'Klares t und klares d – weil kein i-Laut folgt. Nur das End-o wird zu u.',
    mistakes: ['Übergeneralisierung: „TSCHU-du“'],
    tips: ['„tsch/dsch“ nur vor i-Laut! tudo, todo, dado bleiben „normal“.', 'Tudo bem? ≈ „TU-du bẽi?“'],
  }),

  // ───────── L am Silbenende ─────────
  mk('l-final', 'brasil', {
    text: 'Brasil', german: 'Brasilien', helper: 'bra-„SIU“ – L am Ende wie u', ipa: '[bɾaˈziw]',
    syllables: ['Bra', 'sil'], stress: 1, level: 1, issueCodes: ['l-final', 's-x', 'stress'],
    mouth: 'Getipptes r nach b, summendes s zwischen den Vokalen, Betonung hinten. Am Ende berührt die Zunge **nicht** den Gaumen – die Lippen runden sich zu einem kurzen u.',
    mistakes: ['deutsches „Bra-SIL“ mit klarem L', 'stimmloses s wie in „Bus“'],
    tips: ['L am Silbenende = u: Brasil, legal, futebol.', 'Wörter auf -l werden meist auf der letzten Silbe betont.'],
  }),
  mk('l-final', 'alto', {
    text: 'alto', german: 'hoch; groß (Person); laut', helper: '„AU-tu“', ipa: '[ˈawtu]',
    syllables: ['al', 'to'], stress: 0, level: 1, issueCodes: ['l-final'],
    mouth: 'a gleitet in ein u, dann ein klares t (vor u kein „tsch“) und ein kurzes u.',
    mistakes: ['„AL-to“ mit deutschem L'],
    tips: ['In Brasilien klingen `alto` und `auto` gleich – der Zusammenhang entscheidet.', 'Genauso: `algo` ≈ „AU-gu“.'],
  }),
  mk('l-final', 'mal', {
    text: 'mal', german: 'schlecht (Adverb)', helper: '„mau“', ipa: '[ˈmaw]',
    syllables: ['mal'], stress: 0, level: 1, issueCodes: ['l-final'],
    mouth: 'Kurzes a, das in ein u gleitet. Keine Zungenberührung am Ende.',
    mistakes: ['deutsches „mal“'],
    tips: ['`mal` (schlecht, Adverb) und `mau` (schlecht, Adjektiv) klingen identisch.', '`Tudo bem? – Mais ou menos.` Und wenn es schlecht geht: `Tô mal.`'],
  }),
  mk('l-final', 'legal', {
    text: 'legal', german: 'cool, super; legal', helper: 'le-„GAU“', ipa: '[leˈɡaw]',
    syllables: ['le', 'gal'], stress: 1, level: 1, issueCodes: ['l-final', 'stress'],
    mouth: 'g immer hart vor a. Betonung auf der letzten Silbe, die mit „au“ endet.',
    mistakes: ['Betonung auf „LE“', 'deutsches L am Ende'],
    tips: ['`Que legal!` = Wie cool! – eines der häufigsten Wörter im brasilianischen Alltag.', 'Plural: `legais` ≈ „le-GAIS“.'],
  }),
  mk('l-final', 'futebol', {
    text: 'futebol', german: 'Fußball', helper: 'fu-tschi-„BÓU“', ipa: '[futʃiˈbɔw]',
    syllables: ['fu', 'te', 'bol'], stress: 2, level: 2, issueCodes: ['l-final', 'd-t', 'open-closed'],
    mouth: 'Unbetontes e in der Mitte wird zu i → „tschi“. Betonung auf der letzten Silbe mit offenem o, das in ein u gleitet.',
    mistakes: ['„FU-te-bol“ wie im Deutschen', 'geschlossenes o'],
    tips: ['Drei Regeln in einem Wort: e → i, t + i → tsch, l → u.', 'Ein lockeres Fußballspiel unter Freunden heißt `pelada`.'],
  }),
  mk('l-final', 'papel', {
    text: 'papel', german: 'Papier', helper: 'pa-„PÄU“ – offenes e', ipa: '[paˈpɛw]',
    syllables: ['pa', 'pel'], stress: 1, level: 2, issueCodes: ['l-final', 'open-closed'],
    mouth: 'Betonung hinten, offenes e wie in „Bär“, das in ein u gleitet.',
    mistakes: ['„pa-PEL“ mit geschlossenem e und deutschem L'],
    tips: ['Plural: `papéis` – das offene e bekommt im Plural einen Akzent.', 'Genauso: `hotel` ≈ „o-TÄU“ (h ist stumm!).'],
  }),

  // ───────── S, Z, X, CH ─────────
  mk('s-x', 'casa', {
    text: 'casa', german: 'Haus', helper: '„KA-sa“ – s summt wie in „Rose“', ipa: '[ˈkazɐ]',
    syllables: ['ca', 'sa'], stress: 0, level: 1, issueCodes: ['s-x'],
    mouth: 'Einzelnes s zwischen zwei Vokalen ist **stimmhaft**: Die Stimmbänder vibrieren – wie beim deutschen s in „Rose“.',
    mistakes: ['stimmloses „ß“ – `caça` (Jagd) statt `casa`'],
    tips: ['Leg die Hand an den Hals: Beim s in `casa` spürst du Vibration.', 'ss zwischen Vokalen ist stimmlos: `nosso`, `sessenta`.'],
  }),
  mk('s-x', 'sapato', {
    text: 'sapato', german: 'Schuh', helper: 'ßa-„PA“-tu – s am Anfang stimmlos', ipa: '[saˈpatu]',
    syllables: ['sa', 'pa', 'to'], stress: 1, level: 1, issueCodes: ['s-x'],
    mouth: 'Am Wortanfang ist s **stimmlos** – wie „ß“ in „Straße“, ohne Summen.',
    mistakes: ['summendes deutsches s wie in „Sonne“ – ein sehr typischer deutscher Akzent'],
    tips: ['Denk bei jedem s am Wortanfang an „ß“: `sim`, `sapato`, `sete`.', 'Das deutsche Anfangs-s summt, das portugiesische nicht.'],
  }),
  mk('s-x', 'nosso', {
    text: 'nosso', german: 'unser', helper: '„NÓ-ßu“ – offenes o, stimmloses ss', ipa: '[ˈnɔsu]',
    syllables: ['nos', 'so'], stress: 0, level: 2, issueCodes: ['s-x', 'open-closed'],
    mouth: 'Offenes o, dann ein scharfes, stimmloses s.',
    mistakes: ['summendes s', 'geschlossenes o'],
    tips: ['ss = immer stimmlos.', 'Weiblich: `nossa` – auch ein Ausruf des Staunens: „Nossa!“ (Wow!).'],
  }),
  mk('s-x', 'cha', {
    text: 'chá', german: 'Tee', helper: '„schá“ – ch wie deutsches sch', ipa: '[ˈʃa]',
    syllables: ['chá'], stress: 0, level: 1, issueCodes: ['s-x'],
    mouth: 'ch = „sch“ wie in „Schule“, nie wie in „ich“ oder „Bach“.',
    mistakes: ['„tscha“ wie im englischen „chat“', 'deutsches ch'],
    tips: ['`chá` (Tee) vs. `já` (schon): „scha“ stimmlos, „ʒa“ stimmhaft wie in „Journal“.'],
  }),
  mk('s-x', 'xicara', {
    text: 'xícara', german: 'Tasse', helper: '„SCHI“-ka-ra – x wie sch', ipa: '[ˈʃikaɾɐ]',
    syllables: ['xí', 'ca', 'ra'], stress: 0, level: 2, issueCodes: ['s-x', 'stress'],
    mouth: 'x am Wortanfang = „sch“. Betonung auf der ersten Silbe (Akzent!), getipptes r.',
    mistakes: ['„ksi-KA-ra“', 'Betonung auf der zweiten Silbe'],
    tips: ['x hat mehrere Aussprachen: „sch“ (xícara, caixa), „s“ (próximo), „ks“ (táxi), „z“ (exame). Am häufigsten ist „sch“.', '`uma xícara de café` = eine Tasse Kaffee.'],
  }),
  mk('s-x', 'mesmo', {
    text: 'mesmo', german: 'selbst; derselbe; wirklich', helper: '„MES-mu“ – s vor m summt', ipa: '[ˈmezmu]',
    syllables: ['mes', 'mo'], stress: 0, level: 3, issueCodes: ['s-x'],
    mouth: 'Vor einem stimmhaften Konsonanten (m, n, d, g, b …) wird s stimmhaft.',
    mistakes: ['scharfes „ß“ vor m'],
    tips: ['In Rio: „MESCH-mu“ (stimmhaftes sch). Beides ist korrekt.', '`É mesmo?` = Echt? Wirklich?'],
  }),
  mk('s-x', 'tres-horas', {
    text: 'três horas', german: 'drei Uhr; drei Stunden', helper: '„trei-SÓ-ras“ – das End-s summt ins nächste Wort hinüber', ipa: '[ˈtɾejz ˈɔɾɐs]',
    syllables: ['três', 'ho', 'ras'], stress: 1, level: 2, issueCodes: ['s-x', 'open-closed'],
    mouth: '`três` klingt im Alltag oft wie „treis“ (ein kleines i schleicht sich ein). Das End-s wird vor einem Vokal **stimmhaft** wie in „Rose“ und bindet direkt an `horas` an – das h ist stumm. `ho` hat ein offenes o, das r ist ein kurzer Zungenschlag.',
    mistakes: ['scharfes „ß“ und Pause zwischen den Wörtern', 'gesprochenes h in „horas“', 'Reibe-R statt Zungenschlag in „horas“'],
    tips: ['Sprich es wie ein Wort: „trei-SÓ-ras“.', 'Gleiche Regel: `duas horas` ≈ „DU-a-SÓ-ras“, `dois anos` ≈ „doi-SA-nus“.', 'In Rio klingt das End-s vor Pause oder Konsonant wie „sch“ (`três` ≈ „treisch“) – vor einem Vokal summt es aber überall.'],
  }),

  // ───────── Betonung ─────────
  mk('stress', 'cafe', {
    text: 'café', german: 'Kaffee; Café', helper: 'ka-„FÄ“ – Betonung hinten, offenes e', ipa: '[kaˈfɛ]',
    syllables: ['ca', 'fé'], stress: 1, level: 1, issueCodes: ['stress', 'open-closed'],
    mouth: 'Erste Silbe kurz und leicht, die zweite betont mit offenem e wie in „Bär“.',
    mistakes: ['Betonung auf „KA“', 'geschlossenes e wie in „See“'],
    tips: ['Ein geschriebener Akzent zeigt immer die betonte Silbe.', '`café da manhã` = Frühstück.'],
  }),
  mk('stress', 'voce', {
    text: 'você', german: 'du', helper: 'wo-„ßE“ – Betonung hinten, geschlossenes e', ipa: '[voˈse]',
    syllables: ['vo', 'cê'], stress: 1, level: 1, issueCodes: ['stress', 'open-closed'],
    mouth: 'v wie w, unbetontes kurzes o, dann betontes, geschlossenes e wie in „See“. c vor e = stimmloses s.',
    mistakes: ['„WO-ze“ mit Betonung vorne und summendem s', 'offenes „ä“ am Ende'],
    tips: ['Zirkumflex ^ = betont **und** geschlossen.', 'Umgangssprachlich oft verkürzt zu `cê`: „Cê tá bem?“'],
  }),
  mk('stress', 'medico', {
    text: 'médico', german: 'Arzt', helper: '„MÄ“-dschi-ku – Betonung vorne', ipa: '[ˈmɛdʒiku]',
    syllables: ['mé', 'di', 'co'], stress: 0, level: 2, issueCodes: ['stress', 'd-t', 'open-closed'],
    mouth: 'Betonung auf der drittletzten Silbe (Akzent!), offenes e. `di` wird zu „dschi“, das End-o zu u.',
    mistakes: ['Betonung auf „DI“ („me-DI-ko“) wie im Deutschen „Mediziner“'],
    tips: ['Wörter, die auf der drittletzten Silbe betont werden, tragen immer einen Akzent.', 'Weiblich: `médica` ≈ „MÄ-dschi-ka“.'],
  }),
  mk('stress', 'onibus', {
    text: 'ônibus', german: 'Bus', helper: '„O“-ni-bus – Betonung ganz vorne', ipa: '[ˈonibus]',
    syllables: ['ô', 'ni', 'bus'], stress: 0, level: 2, issueCodes: ['stress', 'open-closed'],
    mouth: 'Erste Silbe betont, geschlossenes o. Die anderen Silben kurz und leicht.',
    mistakes: ['„o-NI-bus“', '„Omnibus“ wie im Deutschen'],
    tips: ['Der Zirkumflex zeigt Betonung und geschlossenes o.', 'Plural bleibt gleich: `os ônibus`.'],
  }),
  mk('stress', 'computador', {
    text: 'computador', german: 'Computer', helper: 'kõ-pu-ta-„DO(h)“ – Betonung ganz hinten', ipa: '[kõputaˈdo(h)]',
    syllables: ['com', 'pu', 'ta', 'dor'], stress: 3, level: 3, issueCodes: ['stress', 'nasal', 'r'],
    mouth: 'Erste Silbe nasal (kein hörbares m), alle Silben gleichmäßig, Betonung auf der letzten. Das End-r ist schwach.',
    mistakes: ['Betonung auf „PU“ wie im Englischen „computer“', 'hörbares m in „com“'],
    tips: ['Faustregel: Wörter auf -r, -l, -z, -i, -u und Nasal-Endungen (außer -am/-em) werden auf der letzten Silbe betont.', 'Wörter auf -a, -e, -o (+ s) auf der vorletzten.'],
  }),

  // ───────── Satzmelodie & Rhythmus ─────────
  mk('rhythm', 'tudo-bem', {
    text: 'Tudo bem?', german: 'Wie geht’s?', helper: '„TU-du BẼI?“ – Stimme am Ende hoch und wieder leicht runter', ipa: '[ˈtudu ˈbẽj̃]',
    syllables: ['Tu', 'do', 'bem'], stress: 2, level: 1, issueCodes: ['rhythm', 'nasal'],
    mouth: 'Satzakzent auf `bem`. Ja/Nein-Fragen steigen im brasilianischen Portugiesisch auf der letzten betonten Silbe an.',
    mistakes: ['monotone Aussprache ohne Frage-Melodie', '„tudo bemm“ mit deutschem m'],
    tips: ['Die Frage unterscheidet sich von der Antwort nur durch die Melodie: `Tudo bem?` ↗ – `Tudo bem.` ↘', 'Freundlich und etwas singend klingen – das ist brasilianisch.'],
  }),
  mk('rhythm', 'bom-dia', {
    text: 'Bom dia!', german: 'Guten Morgen!', helper: '„bõ DSCHI-a“ – zwei Wörter, ein Fluss', ipa: '[bõ ˈdʒiɐ]',
    syllables: ['Bom', 'di', 'a'], stress: 1, level: 1, issueCodes: ['rhythm', 'nasal', 'd-t'],
    mouth: 'Nasales o gleitet ohne m direkt in „dschi-a“. Betonung auf `di`.',
    mistakes: ['„bomm di-a“ mit Pause und m', 'klares d statt „dsch“'],
    tips: ['Sprich es wie ein Wort: „bõdschia“.', 'Genauso: `Boa tarde` ≈ „BO-a TAH-dschi“, `Boa noite` ≈ „BO-a NOI-tschi“.'],
  }),
  mk('rhythm', 'muito-prazer', {
    text: 'Muito prazer!', german: 'Freut mich (sehr)!', helper: '„MŨI-tu pra-SE(h)“', ipa: '[ˈmũjtu pɾaˈze(h)]',
    syllables: ['Mui', 'to', 'pra', 'zer'], stress: 3, level: 2, issueCodes: ['rhythm', 'nasal', 'r'],
    mouth: '`muito` hat ein nasales „ũi“ (obwohl kein n geschrieben ist!). In `prazer` ist das r nach p getippt, z summt, das End-r ist schwach.',
    mistakes: ['„MUI-to“ ohne Nasalierung', 'Reibe-R in „pra“'],
    tips: ['`muito` ist eine Ausnahme: nasal ausgesprochen, aber nicht so geschrieben.', 'Antwort: `O prazer é meu!` – Die Freude ist ganz meinerseits.'],
  }),
  mk('rhythm', 'meu-nome-e', {
    text: 'Meu nome é Paulo.', german: 'Mein Name ist Paulo.', helper: '„me-u NÕ-mjä PAU-lu“ – nome und é verschmelzen', ipa: '[ˈmew ˈnõmi ˈɛ ˈpawlu]',
    syllables: ['Meu', 'no', 'me', 'é', 'Pau', 'lo'], stress: 4, level: 2, issueCodes: ['rhythm', 'open-closed'],
    mouth: '`meu` ≈ „me-u“ (geschlossenes e). Das End-e von `nome` wird zu i und verschmilzt mit dem offenen `é`. Satzakzent auf dem Namen.',
    mistakes: ['jedes Wort einzeln mit Pausen', '`meu` wie deutsches „eu“ in „neu“'],
    tips: ['Portugiesisch bindet Vokale über Wortgrenzen hinweg: „no-mjä“ statt „no-me – ä“.', 'Der Name bekommt die stärkste Betonung.'],
  }),
  mk('rhythm', 'de-onde-voce-e', {
    text: 'De onde você é?', german: 'Woher kommst du?', helper: '„dschi ÕN-dschi wo-ßE Ä?“ – Stimme am Ende runter', ipa: '[dʒi ˈõdʒi voˈse ˈɛ]',
    syllables: ['De', 'on', 'de', 'vo', 'cê', 'é'], stress: 5, level: 2, issueCodes: ['rhythm', 'd-t', 'nasal'],
    mouth: 'Unbetontes `de` ≈ „dschi“, `onde` mit nasalem o und „dschi“. Fragen mit Fragewort fallen am Ende eher ab.',
    mistakes: ['Frage-Melodie steigend wie bei Ja/Nein-Fragen', 'klares d in „de“ und „onde“'],
    tips: ['W-Fragen: Melodie fällt am Ende. Ja/Nein-Fragen: Melodie steigt.', 'Umgangssprachlich: `Você é de onde?`'],
  }),
  mk('rhythm', 'a-gente', {
    text: 'A gente se vê!', german: 'Wir sehen uns!', helper: '„a SCHẼN-tschi ßi WE!“', ipa: '[a ˈʒẽtʃi si ˈve]',
    syllables: ['A', 'gen', 'te', 'se', 'vê'], stress: 4, level: 2, issueCodes: ['rhythm', 'nasal', 'd-t'],
    mouth: 'g vor e = stimmhaftes „sch“ wie in „Journal“. Nasales e, dann „tschi“. Unbetontes `se` ≈ „ßi“. Satzakzent auf `vê` (geschlossenes e).',
    mistakes: ['hartes g wie in „gut“', '„gen-te“ mit klarem t'],
    tips: ['g vor e/i und j klingen wie das „j“ in „Journal“.', 'Beliebter Abschied unter Freunden – wie „Man sieht sich!“.'],
  }),
  mk('rhythm', 'que-horas-sao', {
    text: 'Que horas são?', german: 'Wie spät ist es?', helper: '„ki Ó-ras ßãu?“ – Stimme am Ende runter', ipa: '[ki ˈɔɾɐs ˈsɐ̃w̃]',
    syllables: ['Que', 'ho', 'ras', 'são'], stress: 3, level: 1, issueCodes: ['rhythm', 'ao', 'open-closed'],
    mouth: 'Unbetontes `que` klingt wie ein kurzes „ki“. In `horas` ist das h stumm, das o offen, das r ein kurzer Zungenschlag. `são` endet auf dem nasalen „ãu“ – dort liegt der Satzakzent, danach fällt die Melodie.',
    mistakes: ['„kwe“ oder „ke“ statt „ki“', 'gehauchtes h in „horas“', '„sau“ ohne Nasal am Ende'],
    tips: ['Fragen mit Fragewort fallen am Ende ab – wie im Deutschen.', 'Die zwei s von `horas são` verschmelzen zu einem scharfen „ß“: „Ó-ra-ßãu“.', 'Antworten: `É uma hora.` – `São três horas.`'],
  }),
  mk('rhythm', 'eu-me-levanto', {
    text: 'Eu me levanto cedo.', german: 'Ich stehe früh auf.', helper: '„eu mi le-WÃN-tu ßE-du“ – me ganz leicht wie „mi“', ipa: '[ˈew mi leˈvɐ̃tu ˈsedu]',
    syllables: ['Eu', 'me', 'le', 'van', 'to', 'ce', 'do'], stress: 5, level: 2, issueCodes: ['rhythm', 'nasal'],
    mouth: 'Das Pronomen `me` ist unbetont und klingt wie ein kurzes „mi“ – es lehnt sich an das Verb an: „mi-le-WÃN-tu“. `van` ist nasal (kein hörbares n), `cedo` beginnt mit scharfem „ß“, hat ein geschlossenes e und endet auf „u“.',
    mistakes: ['betontes „ME“ mit Pause davor', '„le-VAN-to“ mit deutlichem n und o am Ende', 'summendes s in „cedo“'],
    tips: ['Sprich `me levanto` wie ein Wort: „mi-le-WÃN-tu“.', 'Genauso: `você se levanta` ≈ „wo-ßE ßi le-WÃN-ta“, `me chamo` ≈ „mi SCHÃ-mu“.'],
  }),
];

const idsOf = (cat: string) => pronItems.filter((p) => p.categoryId === cat).map((p) => p.id);

export const pronCategories: PronCategory[] = [
  {
    id: 'pt.pc.nasal', courseId: 'pt-BR', title: 'Nasalvokale', icon: '👃',
    description: 'Vokale, bei denen die Luft durch Mund **und** Nase strömt: ã, õ sowie Vokal + m/n am Silbenende. Das m/n wird dabei nicht als eigener Laut gesprochen.',
    itemIds: idsOf('pt.pc.nasal'),
    minimalPairs: [['lá', 'lã'], ['mito', 'minto'], ['cato', 'canto']],
  },
  {
    id: 'pt.pc.ao', courseId: 'pt-BR', title: 'Das nasale -ão', icon: '🔔',
    description: 'Das berühmte „nãu“: ein nasales au ohne m oder n am Ende. Auch -am am Wortende (falam) klingt so.',
    itemIds: idsOf('pt.pc.ao'),
    minimalPairs: [['pau', 'pão'], ['mau', 'mão']],
  },
  {
    id: 'pt.pc.open-closed', courseId: 'pt-BR', title: 'Offene & geschlossene Vokale', icon: '🔓',
    description: 'é/ó sind offen (wie „Bär“, „Sonne“), ê/ô geschlossen (wie „See“, „Sohn“). Unbetontes -e am Wortende klingt wie i, unbetontes -o wie u.',
    itemIds: idsOf('pt.pc.open-closed'),
    minimalPairs: [['avó', 'avô'], ['é', 'e'], ['pode', 'pôde']],
  },
  {
    id: 'pt.pc.lh-nh', courseId: 'pt-BR', title: 'lh und nh', icon: '🔗',
    description: 'Zwei Buchstaben, ein Laut: lh ≈ „lj“ wie in „Familie“, nh ≈ „nj“ wie in „Champagner“. Das h wird nie gesprochen.',
    itemIds: idsOf('pt.pc.lh-nh'),
    minimalPairs: [['filha', 'fila'], ['malha', 'mala'], ['unha', 'uma']],
  },
  {
    id: 'pt.pc.r', courseId: 'pt-BR', title: 'Die R-Laute', icon: '🌬️',
    description: 'R am Wortanfang und rr klingen wie ein kräftiges deutsches **h**. Ein einzelnes r zwischen Vokalen oder nach Konsonant in derselben Silbe (br, pr, tr …) ist ein kurzer Zungenschlag. Das R am Silbenende variiert regional.',
    itemIds: idsOf('pt.pc.r'),
    minimalPairs: [['caro', 'carro'], ['muro', 'murro'], ['era', 'erra']],
  },
  {
    id: 'pt.pc.d-t', courseId: 'pt-BR', title: 't und d vor i', icon: '🚂',
    description: 'Vor einem i-Laut (auch vor unbetontem -e am Wortende) werden t und d zu „tsch“ und „dsch“: tia, dia, noite, cidade.',
    itemIds: idsOf('pt.pc.d-t'),
    minimalPairs: [['tia', 'dia'], ['tente', 'dente']],
  },
  {
    id: 'pt.pc.l-final', courseId: 'pt-BR', title: 'L am Silbenende', icon: '🌊',
    description: 'Am Silbenende klingt l wie ein kurzes u: Brasil ≈ „bra-SIU“, alto ≈ „AU-tu“.',
    itemIds: idsOf('pt.pc.l-final'),
    minimalPairs: [['mal', 'mar'], ['sal', 'sai']],
  },
  {
    id: 'pt.pc.s-x', courseId: 'pt-BR', title: 'S, Z, X & CH', icon: '🐝',
    description: 's am Wortanfang ist stimmlos (anders als im Deutschen!), zwischen Vokalen stimmhaft. ch und meist auch x klingen wie „sch“.',
    itemIds: idsOf('pt.pc.s-x'),
    minimalPairs: [['casa', 'caça'], ['doze', 'doce'], ['chá', 'já']],
  },
  {
    id: 'pt.pc.stress', courseId: 'pt-BR', title: 'Betonung & Akzente', icon: '🎯',
    description: 'Wörter auf -a, -e, -o (+s, -am, -em) werden auf der vorletzten Silbe betont, die meisten anderen auf der letzten. Ein geschriebener Akzent zeigt immer die betonte Silbe.',
    itemIds: idsOf('pt.pc.stress'),
    minimalPairs: [['sabia', 'sabiá'], ['secretaria', 'secretária']],
  },
  {
    id: 'pt.pc.rhythm', courseId: 'pt-BR', title: 'Satzmelodie & Rhythmus', icon: '🎶',
    description: 'Brasilianisches Portugiesisch klingt melodisch: Vokale verschmelzen über Wortgrenzen, Ja/Nein-Fragen steigen am Ende, W-Fragen fallen.',
    itemIds: idsOf('pt.pc.rhythm'),
  },
];
