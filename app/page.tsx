"use client";
import { useState, useMemo, useRef, createContext, useContext, useEffect } from "react";
import certData from "./data/certifications.json";
import {
  trackCertOpen, trackQuizStart, trackQuizAnswer,
  trackQuizFinish, trackQuizExit, trackFlashcardOpen,
  trackVocabOpen, trackLangSwitch,
} from "../lib/analytics";

// ── Language ──────────────────────────────────────────────────────────────────
type Lang = "en"|"fr"|"es"|"pt";
const LangCtx = createContext<{lang:Lang;setLang:(l:Lang)=>void}>({lang:"en",setLang:()=>{}});
const useLang = ()=>useContext(LangCtx);
const LANG_META:Record<Lang,{flag:string;label:string}> = {
  en:{flag:"🇺🇸",label:"English"}, fr:{flag:"🇫🇷",label:"Français"},
  es:{flag:"🇪🇸",label:"Español"}, pt:{flag:"🇧🇷",label:"Português"},
};

// Pre-generated translations (run generate_translations.py to create)
let TRANS:Record<string,Record<string,Record<string,{q:string;choices:string[];exp:string}>>> = {};
try { TRANS = require("./data/translations.json"); } catch{/*not yet generated*/}
function tQ(catId:string,idx:number,q:{q:string;choices:string[];exp:string},lang:Lang){
  if(lang==="en") return q;
  return {...q,...(TRANS?.[catId]?.[lang]?.[String(idx)]||{})};
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Q = {id:string;q:string;choices:string[];answer:number;exp:string;section?:string;difficulty?:string;passage?:string;vocab?:string;};
type VocabCard = {id:string;term:string;definition_en:string;definition_fr:string;example:string;category:string;};
type Cat = typeof certData.categories[0];
type Diff = "easy"|"medium"|"hard";

const ALL = certData.questions as unknown as Record<string,Q[]>;
const VOCAB = (certData as unknown as {vocab?:Record<string,VocabCard[]>}).vocab||{};

// ── Source registry — only officially published material ───────────────────────
const SOURCE:Record<string,{label:string;url:string;official:boolean;note?:string}> = {
  interpreter:{label:"NYS Court Interpreter Sample Questions (PDF)",url:"https://www.nycourts.gov/legacyPDFs/English%20Language%20Proficiency%20Sample%20Questions.pdf",official:true},
  security:   {label:"NYS Security Guard Manual — DCJS / Security Guard Act 1992",url:"https://www.radianttraining.com/training/security_manual.pdf",official:true},
  dmv:        {label:"NYS Driver's Manual — NYS DMV",url:"https://dmv.ny.gov/driver-license/get-driver-license-0",official:true},
  fdny:       {label:"FDNY Certificate of Fitness Study Guides",url:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",official:false,note:"⚠️ Official FDNY study guide PDF not yet downloaded. Questions need verification against official FDNY materials."},
  cna:        {label:"ATI TEAS / State CNA competency standards",url:"https://www.pearsonvue.com/us/en/nclex.html",official:false,note:"⚠️ Questions need verification against official Pearson VUE / state nursing board published materials."},
  hha:        {label:"NYS DOH HHA training standards",url:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",official:false,note:"⚠️ Questions need verification against official NYS DOH published HHA curriculum."},
  teas:       {label:"ATI TEAS official practice",url:"https://www.atitesting.com/teas/study",official:false,note:"⚠️ Questions need verification against official ATI TEAS published practice materials."},
};

// ── Exam metadata (official public info only) ─────────────────────────────────
const META:Record<string,{fee:string;feeNote:string;where:string;when:string;schedule:string;scheduleUrl:string;studyUrl:string;officialUrl:string;renewNote?:string;}> = {
  fdny:{
    fee:"$25 – $45",feeNote:"F-01: $25 · F-03: $35 · G-60: $45",
    where:"FDNY HQ — 9 MetroTech Center, Brooklyn",
    when:"Mon – Fri, 8 AM – 3 PM (walk-in)",
    schedule:"Walk-in, no appointment needed",
    scheduleUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    studyUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",
    officialUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    renewNote:"Certificate of Fitness expires — renewal exam required",
  },
  cna:{
    fee:"$180 – $220",feeNote:"Pearson VUE exam fee — many training programs cover it",
    where:"Pearson VUE testing centers across NYC",
    when:"Scheduled through Pearson VUE — multiple dates available",
    schedule:"Book at Pearson VUE online after completing your 75-hour training program",
    scheduleUrl:"https://www.pearsonvue.com/us/en/nclex.html",
    studyUrl:"https://www.ncsbn.org/nclex",
    officialUrl:"https://www.health.ny.gov/health_care/medicaid/",
    renewNote:"CNA registration — renew every 2 years with documented work hours",
  },
  hha:{
    fee:"$0 – $50",feeNote:"Usually covered by your 75-hour HHA training program",
    where:"Through your DCJS-approved HHA training program provider",
    when:"Scheduled after completing 75-hour training program",
    schedule:"Contact your training program to schedule the competency evaluation",
    scheduleUrl:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",
    studyUrl:"https://www.health.ny.gov/facilities/home_care/",
    officialUrl:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",
  },
  teas:{
    fee:"$115",feeNote:"ATI TEAS exam fee — check if your nursing school covers retakes",
    where:"Your nursing school or an ATI authorized testing center",
    when:"Multiple testing dates — check ATI's website for your school's schedule",
    schedule:"Register at atitesting.com — select your school and a testing date",
    scheduleUrl:"https://www.atitesting.com/teas/register",
    studyUrl:"https://www.atitesting.com/teas/study",
    officialUrl:"https://www.atitesting.com/teas",
  },
  interpreter:{
    fee:"~$200",feeNote:"NYS Unified Court System exam fee",
    where:"111 Centre Street, Manhattan — Room 1189",
    when:"Scheduled exams — check nycourts.gov for upcoming dates",
    schedule:"Register through the NYS Unified Court System — written exam + oral exam required",
    scheduleUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",
    studyUrl:"https://www.nycourts.gov/legacyPDFs/English%20Language%20Proficiency%20Sample%20Questions.pdf",
    officialUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",
    renewNote:"Re-registration required every 2 years with continuing education",
  },
  dmv:{
    fee:"$80",feeNote:"Includes learner permit + first road test attempt",
    where:"Any NYC DMV office — appointments recommended",
    when:"DMV offices open Mon – Fri — book online at dmv.ny.gov",
    schedule:"Schedule at dmv.ny.gov or call (518) 486-9786",
    scheduleUrl:"https://dmv.ny.gov/office-visit/find-dmv-office-or-kiosk",
    studyUrl:"https://dmv.ny.gov/driver-license/get-driver-license-0",
    officialUrl:"https://dmv.ny.gov/learners-permit",
    renewNote:"Driver license — renew every 8 years (standard) or 5 years (enhanced)",
  },
  security:{
    fee:"$36 – $108",feeNote:"Unarmed: ~$36 · Armed: ~$108 (NYS Dept. of State)",
    where:"DCJS-approved training schools only (must complete 8-hour pre-assignment first)",
    when:"Training schools set their own schedules — check DCJS approved school list",
    schedule:"Complete 8-hr pre-assignment training → apply through NYS Dept. of State",
    scheduleUrl:"https://www.dos.ny.gov/licensing/security_guard/index.html",
    studyUrl:"https://www.criminaljustice.ny.gov/ops/sgtraining/sgpquestion.htm",
    officialUrl:"https://www.dos.ny.gov/licensing/security_guard/index.html",
    renewNote:"Registration valid 2 years — DOS-2012 (unarmed) or DOS-1246 (armed)",
  },
};

// ── Chapters per certification ────────────────────────────────────────────────
const CHAPTERS:Record<string,string[]> = {
  fdny:["Fire Guard Basics","Fire Watch Duties","Emergency Procedures","Fire Prevention","Building Systems"],
  cna: ["Infection Control","Safety & Emergency","Basic Nursing Care","Mental Health","Patient Rights"],
  hha: ["Personal Care","Safety & Environment","Communication","Patient Rights","Nutrition"],
  teas:["Reading Comprehension","Math & Data","Science","English Language"],
  interpreter:["A — Sentence Completion","B — Paragraph Comprehension","C — Grammar & Usage",
               "D — Vocabulary Synonyms","E — Vocabulary Antonyms","F — Idiomatic Expressions","G — Legal Terminology"],
  dmv: ["Traffic Laws","Road Signs & Signals","Right of Way","Driving Skills","Alcohol & Drugs"],
  security:["1 — Role of a Guard","2 — Legal Powers","3 — Emergencies",
            "4 — Communications","5 — Access Control","6 — Ethics","7 — Reports","8 — Notes","9 — Patrol","NYS — Licensing"],
};

function chOf(id:string,i:number,total:number){
  const chs=CHAPTERS[id]||["General"];
  return chs[Math.min(Math.floor((i/total)*chs.length),chs.length-1)];
}

// ── UI strings (EN/FR/ES/PT) ──────────────────────────────────────────────────
const UI:Record<Lang,Record<string,string>> = {
  en:{tagline:"Free License & Certification Prep · NYC",
    subtitle:"Tap any certification to see fees, location, and schedule — then study with flashcards or practice quizzes.",
    examInfo:"Exam info",fee:"Fee",studytime:"Study time",where:"Where",when:"When",schedule:"How to schedule",
    officialLinks:"Official links",practiceWith:"Practice for free",startStudying:"Start Studying →",
    unofficialNote:"Practice questions — verify against official source before your exam.",
    qs:"questions",vocab:"Vocab cards",free:"Free",
    chapters:"By chapter",allDeck:"Full deck",diffTitle:"Choose difficulty",
    easy:"Easy",medium:"Medium",hard:"Hard",easyD:"Foundations — start here",
    medD:"Core material — what the exam covers",hardD:"Advanced — exam-ready challenge",
    qs15:"15 questions",tapFlip:"Tap card to flip",swipeHint:"← swipe or tap arrows to browse →",
    gotIt:"✓ Know it",again:"↺ Review",done:"Done!",restart:"Restart",back:"← Back",
    next:"Next →",results:"See Results",correct:"✓ Correct",wrong:"✗ Incorrect",why:"Why",
    pass:"Passed ✓",fail:"Not yet — keep studying",bookNow:"📅 Schedule your exam →",
    studyMore:"← Study more",practiceOnly:"Practice only — always verify with the official source before your exam.",
    readFirst:"Read the passage, then answer",
    sourceBadge:"Source","officialSource":"Official source","practiceSource":"Practice — needs official source verification",
  },
  fr:{tagline:"Préparation gratuite aux licences et certifications · NYC",
    subtitle:"Appuyez sur une certification pour voir les frais, le lieu et l'horaire — puis étudiez avec des cartes ou des quiz.",
    examInfo:"Infos examen",fee:"Frais",studytime:"Durée d'étude",where:"Lieu",when:"Quand",schedule:"Comment s'inscrire",
    officialLinks:"Liens officiels",practiceWith:"S'entraîner gratuitement",startStudying:"Commencer →",
    unofficialNote:"Questions d'entraînement — vérifiez avec la source officielle avant votre examen.",
    qs:"questions",vocab:"Fiches vocab",free:"Gratuit",
    chapters:"Par chapitre",allDeck:"Tout le jeu",diffTitle:"Choisir la difficulté",
    easy:"Facile",medium:"Moyen",hard:"Difficile",easyD:"Bases — commencez ici",
    medD:"Matière principale — ce que couvre l'examen",hardD:"Avancé — prêt pour l'examen",
    qs15:"15 questions",tapFlip:"Appuyez pour retourner",swipeHint:"← balayez ou flèches pour naviguer →",
    gotIt:"✓ Je sais",again:"↺ Revoir",done:"Terminé !",restart:"Recommencer",back:"← Retour",
    next:"Suivant →",results:"Voir les résultats",correct:"✓ Correct",wrong:"✗ Incorrect",why:"Pourquoi",
    pass:"Réussi ✓",fail:"Pas encore — continuez !",bookNow:"📅 Réserver votre examen →",
    studyMore:"← Étudier encore",practiceOnly:"Entraînement uniquement — vérifiez toujours avec la source officielle.",
    readFirst:"Lisez le passage, puis répondez",
    sourceBadge:"Source","officialSource":"Source officielle","practiceSource":"Entraînement — vérification requise",
  },
  es:{tagline:"Preparación gratuita para licencias y certificaciones · NYC",
    subtitle:"Toque una certificación para ver tarifas, lugar y horario — luego estudie con tarjetas o cuestionarios.",
    examInfo:"Info del examen",fee:"Tarifa",studytime:"Tiempo de estudio",where:"Lugar",when:"Cuándo",schedule:"Cómo inscribirse",
    officialLinks:"Enlaces oficiales",practiceWith:"Practica gratis",startStudying:"Empezar →",
    unofficialNote:"Preguntas de práctica — verifique con la fuente oficial antes del examen.",
    qs:"preguntas",vocab:"Tarjetas vocab",free:"Gratis",
    chapters:"Por capítulo",allDeck:"Mazo completo",diffTitle:"Elegir dificultad",
    easy:"Fácil",medium:"Medio",hard:"Difícil",easyD:"Fundamentos — empiece aquí",
    medD:"Material principal — lo que cubre el examen",hardD:"Avanzado — listo para el examen",
    qs15:"15 preguntas",tapFlip:"Toque para voltear",swipeHint:"← deslice o use flechas →",
    gotIt:"✓ Lo sé",again:"↺ Repasar",done:"¡Terminado!",restart:"Reiniciar",back:"← Atrás",
    next:"Siguiente →",results:"Ver resultados",correct:"✓ Correcto",wrong:"✗ Incorrecto",why:"Por qué",
    pass:"Aprobado ✓",fail:"Siga estudiando",bookNow:"📅 Reservar examen →",
    studyMore:"← Estudiar más",practiceOnly:"Solo práctica — verifique siempre con la fuente oficial.",
    readFirst:"Lea el texto y responda",
    sourceBadge:"Fuente","officialSource":"Fuente oficial","practiceSource":"Práctica — requiere verificación",
  },
  pt:{tagline:"Preparação gratuita para licenças e certificações · NYC",
    subtitle:"Toque em uma certificação para ver taxas, local e horário — depois estude com cartões ou questionários.",
    examInfo:"Info do exame",fee:"Taxa",studytime:"Tempo de estudo",where:"Local",when:"Quando",schedule:"Como se inscrever",
    officialLinks:"Links oficiais",practiceWith:"Praticar de graça",startStudying:"Começar →",
    unofficialNote:"Perguntas de prática — verifique com a fonte oficial antes do exame.",
    qs:"perguntas",vocab:"Cartões vocab",free:"Grátis",
    chapters:"Por capítulo",allDeck:"Baralho completo",diffTitle:"Escolher dificuldade",
    easy:"Fácil",medium:"Médio",hard:"Difícil",easyD:"Fundamentos — comece aqui",
    medD:"Material principal — o que o exame aborda",hardD:"Avançado — pronto para o exame",
    qs15:"15 perguntas",tapFlip:"Toque para virar",swipeHint:"← deslize ou use setas →",
    gotIt:"✓ Sei",again:"↺ Revisar",done:"Concluído!",restart:"Reiniciar",back:"← Voltar",
    next:"Próximo →",results:"Ver resultados",correct:"✓ Correto",wrong:"✗ Incorreto",why:"Por que",
    pass:"Aprovado ✓",fail:"Continue estudando",bookNow:"📅 Agendar exame →",
    studyMore:"← Estudar mais",practiceOnly:"Apenas prática — verifique sempre com a fonte oficial.",
    readFirst:"Leia o texto e responda",
    sourceBadge:"Fonte","officialSource":"Fonte oficial","practiceSource":"Prática — requer verificação",
  },
};
function useT(){const {lang}=useLang();return (k:string)=>UI[lang]?.[k]??UI.en[k]??k;}

// ── Language bar ──────────────────────────────────────────────────────────────
function LangBar({dark}:{dark?:boolean}){
  const {lang,setLang}=useLang();
  return(
    <div className={`flex gap-1 flex-wrap px-4 py-2 ${dark?"bg-black/20":"bg-white border-b border-gray-100"}`}>
      {(Object.entries(LANG_META) as [Lang,{flag:string;label:string}][]).map(([code,m])=>(
        <button key={code} onClick={()=>{const prev=lang;setLang(code);if(prev!==code)trackLangSwitch(prev,code);}}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${lang===code
            ?(dark?"bg-white text-gray-900":"bg-blue-900 text-white")
            :(dark?"text-white/60 hover:text-white":"text-gray-500 hover:bg-gray-100")}`}>
          {m.flag} {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({catId}:{catId:string}){
  const t=useT();
  const src=SOURCE[catId];
  if(!src) return null;
  return(
    <div className={`flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed ${src.official?"bg-green-50 border border-green-200":"bg-amber-50 border border-amber-200"}`}>
      <span>{src.official?"✅":"⚠️"}</span>
      <div>
        <span className={`font-bold ${src.official?"text-green-800":"text-amber-800"}`}>
          {src.official?t("officialSource"):t("practiceSource")}
        </span>
        {" — "}<a href={src.url} target="_blank" rel="noopener noreferrer"
          className={`underline ${src.official?"text-green-700":"text-amber-700"}`}>{src.label}</a>
        {src.note&&<p className="text-amber-700 mt-1">{src.note}</p>}
      </div>
    </div>
  );
}

// ── Tinder-style flashcard viewer ─────────────────────────────────────────────
// Shows: word list → click word → swipe left/right through cards, each flippable
function FlashDeck({cards,startIdx,onBack}:{
  cards:{front:string;back:string;backFr?:string;example?:string}[];
  startIdx:number;
  onBack:()=>void;
}){
  const {lang}=useLang();
  const t=useT();
  const [idx,setIdx]=useState(startIdx);
  const [flipped,setFlipped]=useState(false);
  const [dir,setDir]=useState<"next"|"prev"|null>(null);
  const touchX=useRef<number|null>(null);
  const card=cards[idx];

  function goNext(){if(idx<cards.length-1){setIdx(i=>i+1);setFlipped(false);setDir("next");}}
  function goPrev(){if(idx>0){setIdx(i=>i-1);setFlipped(false);setDir("prev");}}

  function onTouchStart(e:React.TouchEvent){touchX.current=e.touches[0].clientX;}
  function onTouchEnd(e:React.TouchEvent){
    if(touchX.current===null) return;
    const dx=e.changedTouches[0].clientX-touchX.current;
    if(Math.abs(dx)>50){dx<0?goNext():goPrev();}
    touchX.current=null;
  }

  const back=lang==="fr"&&card.backFr ? `${card.backFr}\n\nEN: ${card.back}` : card.back;

  return(
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-bold text-lg">←</button>
        <div className="flex-1 text-sm text-gray-500">{idx+1} / {cards.length}</div>
        <LangBar/>
      </div>

      {/* progress bar */}
      <div className="h-0.5 bg-gray-100"><div className="h-full bg-blue-500 transition-all" style={{width:`${((idx+1)/cards.length)*100}%`}}/></div>

      {/* card */}
      <div className="flex-1 flex flex-col items-center justify-center p-4"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button onClick={()=>setFlipped(f=>!f)}
          className="w-full max-w-md min-h-64 bg-white rounded-2xl shadow-md p-6 text-left active:scale-[0.99] transition-all relative">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400 block mb-4">
            {flipped?"Definition — tap to see term again":"Term — tap to see definition"}
          </span>
          {!flipped?(
            <p className="text-3xl font-black text-gray-900 leading-tight">{card.front}</p>
          ):(
            <div>
              <p className="text-lg font-semibold text-gray-900 leading-relaxed whitespace-pre-line">{back}</p>
              {card.example&&<p className="text-sm text-blue-600 italic mt-3">"{card.example}"</p>}
            </div>
          )}
          {!flipped&&<div className="absolute bottom-4 right-4 text-3xl text-gray-200">↺</div>}
        </button>

        {/* nav arrows */}
        <div className="flex items-center gap-4 mt-6 w-full max-w-md justify-between">
          <button onClick={goPrev} disabled={idx===0}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${idx===0?"bg-gray-100 text-gray-300":"bg-white shadow text-gray-700 hover:bg-gray-50 active:scale-95"}`}>
            ←
          </button>
          <p className="text-xs text-gray-400">{t("swipeHint")}</p>
          <button onClick={goNext} disabled={idx===cards.length-1}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${idx===cards.length-1?"bg-gray-100 text-gray-300":"bg-white shadow text-gray-700 hover:bg-gray-50 active:scale-95"}`}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vocab word list → tap word → swipe deck ───────────────────────────────────
function VocabBrowser({catId,filter,color,onBack}:{catId:string;filter:string|null;color:string;onBack:()=>void}){
  const {lang}=useLang();
  const cards=(VOCAB[catId]||[]).filter(c=>!filter||c.category===filter);
  const [startIdx,setStartIdx]=useState<number|null>(null);

  if(startIdx!==null){
    const deckCards=cards.map(c=>({
      front:c.term,
      back:c.definition_en,
      backFr:c.definition_fr,
      example:c.example,
    }));
    return<FlashDeck cards={deckCards} startIdx={startIdx} onBack={()=>setStartIdx(null)}/>;
  }

  const categoryLabel=(cat:string)=>({vocabulary:"📖 Vocabulary",idiom:"🗣 Idioms",legal:"⚖️ Legal"})[cat]||cat;

  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 font-bold text-lg">←</button>
        <div className="flex-1 font-bold text-gray-900 text-sm">
          {filter?categoryLabel(filter):"All vocabulary"} · {cards.length} cards
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        <p className="text-xs text-gray-400 mb-3 px-1">Tap any word to start — then swipe left/right to browse</p>
        {cards.length===0&&<p className="text-gray-400 text-center py-8">No cards in this set.</p>}
        <div className="flex flex-col gap-2">
          {cards.map((card,i)=>(
            <button key={card.id} onClick={()=>setStartIdx(i)}
              className="w-full text-left bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.99] transition-all flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{backgroundColor:color}}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm">{card.term}</div>
                <div className="text-xs text-gray-400 truncate">
                  {lang==="fr"?card.definition_fr:card.definition_en}
                </div>
              </div>
              <span className="text-gray-300 text-lg shrink-0">→</span>
            </button>
          ))}
        </div>
        {cards.length>0&&(
          <button onClick={()=>setStartIdx(0)}
            className="w-full mt-4 py-3 rounded-xl font-bold text-white text-center" style={{backgroundColor:color}}>
            Start from beginning →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Flashcards from quiz questions (Tinder style) ──────────────────────────────
function QuestionFlashDeck({cat,filter,onBack}:{cat:Cat&{color:string;bg:string};filter:string|null;onBack:()=>void}){
  const {lang}=useLang();
  const allQs=ALL[cat.id]||[];
  const qs=useMemo(()=>{
    const mapped=allQs.map((q,i)=>{
      const tq=tQ(cat.id,i,q,lang);
      return {front:tq.q, back:(tq.choices[q.answer]||""), example:tq.exp, ch:chOf(cat.id,i,allQs.length)};
    });
    return filter?mapped.filter(c=>c.ch===filter):mapped;
  },[allQs,cat.id,filter,lang]);
  const [startIdx,setStartIdx]=useState<number|null>(null);

  if(startIdx!==null) return<FlashDeck cards={qs} startIdx={startIdx} onBack={()=>setStartIdx(null)}/>;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold text-sm truncate">{filter||"All questions"} · {qs.length} cards</div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        <p className="text-xs text-gray-400 mb-3 px-1">Tap any question to start — then use arrows or swipe to browse</p>
        <div className="flex flex-col gap-2">
          {qs.map((card,i)=>(
            <button key={i} onClick={()=>setStartIdx(i)}
              className="w-full text-left bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{backgroundColor:cat.color}}>{i+1}</span>
              <p className="flex-1 text-sm text-gray-800 line-clamp-2">{card.front}</p>
              <span className="text-gray-300 shrink-0">→</span>
            </button>
          ))}
        </div>
        {qs.length>0&&(
          <button onClick={()=>setStartIdx(0)}
            className="w-full mt-4 py-3 rounded-xl font-bold text-white" style={{backgroundColor:cat.color}}>
            Start from beginning →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function Quiz({cat,diff,chapter,onBack}:{cat:Cat&{color:string;bg:string};diff:Diff;chapter:string|null;onBack:()=>void}){
  const {lang}=useLang();
  const t=useT();
  const allQs=ALL[cat.id]||[];
  const qs=useMemo(()=>{
    let pool=allQs.map((q,i)=>({...q,_i:i,_ch:chOf(cat.id,i,allQs.length)}));
    if(chapter) pool=pool.filter(q=>q._ch===chapter);
    if(diff==="easy")   pool=pool.filter(q=>q.difficulty==="easy"||!q.difficulty).slice(0,15);
    else if(diff==="medium") pool=pool.filter(q=>q.difficulty!=="hard").slice(0,15);
    else pool=pool.slice(-15);
    return pool.slice(0,15);
  },[allQs,cat.id,diff,chapter]);
  const [idx,setIdx]=useState(0);
  const [picked,setPicked]=useState<number|null>(null);
  const [score,setScore]=useState(0);
  const [done,setDone]=useState(false);
  const meta=META[cat.id];
  const _q=qs[idx];
  const q=_q?{..._q,...tQ(cat.id,_q._i,_q,lang)}:undefined;

  // Track quiz finish when done becomes true
  useEffect(()=>{if(done)trackQuizFinish(cat.id,score,qs.length);},[done]); // eslint-disable-line

  function choose(i:number){
    if(picked!==null||!_q)return;
    const correct=i===_q.answer;
    setPicked(i);
    if(correct)setScore(s=>s+1);
    trackQuizAnswer(cat.id, idx, correct);
  }
  function next(){if(idx+1>=qs.length)setDone(true);else{setIdx(i=>i+1);setPicked(null);}}
  if(!qs.length)return(
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center"><p className="text-gray-500 mb-4">No questions for this selection.</p>
      <button onClick={onBack} className="font-bold" style={{color:cat.color}}>← Back</button></div>
    </div>
  );
  if(done){
    const pct=Math.round((score/qs.length)*100);
    const pass=pct>=70;
    return(
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-5xl mb-3">{pass?"🎉":"📚"}</div>
          <h2 className="text-2xl font-black mb-1" style={{color:pass?"#16a34a":cat.color}}>
            {pass?t("pass"):t("fail")}
          </h2>
          <p className="text-gray-500 mb-4">{score}/{qs.length} · {pct}%</p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:pass?"#16a34a":cat.color}}/>
          </div>
          {meta&&<a href={pass?meta.scheduleUrl:meta.studyUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-white font-bold text-center mb-3 hover:opacity-90"
            style={{backgroundColor:cat.color}}>
            {pass?t("bookNow"):t("startStudying")}
          </a>}
          <button onClick={onBack} className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-600">{t("studyMore")}</button>
          <p className="text-xs text-gray-400 mt-4">{t("practiceOnly")}</p>
        </div>
      </div>
    );
  }
  if(!q)return null;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={()=>{if(!done)trackQuizExit(cat.id,idx,qs.length);onBack();}} className="text-white/80 font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm truncate">{chapter||cat.title}</div>
          <div className="text-white/70 text-xs">{["🟢","🟡","🔴"][["easy","medium","hard"].indexOf(diff)]} {idx+1}/{qs.length}</div>
        </div>
        <div className="text-white font-bold">{score}/{idx+(picked!==null?1:0)}</div>
      </div>
      <div className="h-1 bg-gray-100"><div className="h-full transition-all" style={{width:`${((idx+(picked!==null?1:0))/qs.length)*100}%`,backgroundColor:cat.color}}/></div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        {_q.passage&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-700 mb-1">{t("readFirst")}</p>
          <p className="text-sm text-blue-900 leading-relaxed">{_q.passage}</p>
        </div>}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <p className="font-semibold text-gray-900 leading-relaxed">{q.q}</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((ch,i)=>{
            const sel=picked===i,corr=i===_q.answer;
            let cls="bg-white border-gray-200 text-gray-800";
            if(picked!==null){if(corr)cls="bg-green-50 border-green-400 text-green-800";else if(sel)cls="bg-red-50 border-red-400 text-red-800";}
            return<button key={i} onClick={()=>choose(i)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls} ${picked===null?"hover:border-blue-200 hover:bg-blue-50/30":""}`}>
              <span className="font-bold mr-2">{["A","B","C","D"][i]}.</span>{ch}
              {picked!==null&&corr&&" ✓"}{picked!==null&&sel&&!corr&&" ✗"}
            </button>;
          })}
        </div>
        {picked!==null&&q.exp&&<div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-400 mb-4">
          <p className="text-xs font-bold text-amber-700 mb-1">{picked===_q.answer?t("correct"):t("wrong")} — {t("why")}</p>
          <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
        </div>}
        {picked!==null&&<button onClick={next} className="w-full py-4 rounded-xl font-black text-white hover:opacity-90" style={{backgroundColor:cat.color}}>
          {idx+1<qs.length?t("next"):t("results")}
        </button>}
      </div>
    </div>
  );
}

// ── Study hub (chapters → flashcards or quiz) ─────────────────────────────────
function StudyHub({cat,hasVocab,onBack}:{cat:Cat&{color:string;bg:string};hasVocab:boolean;onBack:()=>void}){
  const t=useT();
  type S="menu"|"chapters"|"vocab_cats"|"vocab_browse"|"flash_list"|"diff"|"quiz";
  const [screen,setScreen]=useState<S>("menu");
  const [chapter,setChapter]=useState<string|null>(null);
  const [diff,setDiff]=useState<Diff>("medium");
  const [vocabFilter,setVocabFilter]=useState<string|null>(null);
  const qs=ALL[cat.id]||[];
  const chs=CHAPTERS[cat.id]||[];
  const vocabCards=VOCAB[cat.id]||[];
  const color=cat.color;

  if(screen==="vocab_browse") return<VocabBrowser catId={cat.id} filter={vocabFilter} color={color} onBack={()=>setScreen("vocab_cats")}/>;
  if(screen==="flash_list")   return<QuestionFlashDeck cat={cat} filter={chapter} onBack={()=>{setScreen("chapters");setChapter(null);}}/>;
  if(screen==="quiz")         return<Quiz cat={cat} diff={diff} chapter={chapter} onBack={()=>setScreen("diff")}/>;

  if(screen==="diff") return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>{setScreen("chapters");}} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold truncate">{chapter||"All chapters"} · {t("diffTitle")}</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6 flex flex-col gap-3">
        {([["easy","🟢","easy","easyD"],["medium","🟡","medium","medD"],["hard","🔴","hard","hardD"]] as const).map(([d,e,lk,dk])=>(
          <button key={d} onClick={()=>{setDiff(d);setScreen("quiz");trackQuizStart(cat.id,chapter,d);}}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 flex items-center gap-4 active:scale-[0.99] transition-all">
            <span className="text-3xl">{e}</span>
            <div className="flex-1"><div className="font-bold text-gray-900">{t(lk)}</div>
              <div className="text-sm text-gray-500">{t(dk)}</div></div>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{backgroundColor:cat.bg,color}}>{t("qs15")}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if(screen==="chapters") return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>setScreen("menu")} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold">{t("chapters")}</div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        {/* full deck option */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:color}}>★</span>
            <div className="flex-1 font-bold text-gray-800">{t("allDeck")} · {qs.length} {t("qs")}</div>
          </div>
          <div className="flex border-t border-gray-50">
            <button onClick={()=>{setChapter(null);setScreen("flash_list");trackFlashcardOpen(cat.id,null);}}
              className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color}}>
              📇 {t("allDeck")}
            </button>
            <div className="w-px bg-gray-100"/>
            <button onClick={()=>{setChapter(null);setScreen("diff");}}
              className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color}}>
              📝 Quiz
            </button>
          </div>
        </div>
        {/* chapter list */}
        <div className="flex flex-col gap-2">
          {chs.map((ch,i)=>(
            <div key={ch} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{borderLeftWidth:3,borderLeftColor:color}}>
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:color}}>{i+1}</span>
                <div className="flex-1 font-semibold text-gray-800 text-sm">{ch}</div>
              </div>
              <div className="flex border-t border-gray-50">
                <button onClick={()=>{setChapter(ch);setScreen("flash_list");trackFlashcardOpen(cat.id,ch);}}
                  className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color}}>
                  📇 Cards
                </button>
                <div className="w-px bg-gray-100"/>
                <button onClick={()=>{setChapter(ch);setScreen("diff");}}
                  className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color}}>
                  📝 Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if(screen==="vocab_cats") return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>setScreen("menu")} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold">📇 Vocabulary Cards</div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        <p className="text-xs text-gray-400 mb-3 px-1">
          Tap a set → see the word list → tap any word to start swiping
        </p>
        {[["","All vocabulary words",vocabCards.length],
          ["vocabulary","📖 General Vocabulary",vocabCards.filter(c=>c.category==="vocabulary").length],
          ["idiom","🗣 Idiomatic Expressions",vocabCards.filter(c=>c.category==="idiom").length],
          ["legal","⚖️ Legal Terms",vocabCards.filter(c=>c.category==="legal").length]].map(([f,label,n])=>(
          Number(n)===0?null:
          <button key={String(f)} onClick={()=>{setVocabFilter(f?String(f):null);setScreen("vocab_browse");trackVocabOpen(cat.id,f?String(f):null);}}
            className="w-full text-left bg-white rounded-2xl p-4 mb-2 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{borderLeftColor:color}}>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {Number(n)} cards · EN + {useLang().lang==="fr"?"FR":"French/chosen language"}
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color}}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // menu
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={onBack} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold">{cat.emoji} {cat.title}</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5 flex flex-col gap-3">
        <button onClick={()=>setScreen("chapters")}
          className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
          style={{borderLeftColor:color}}>
          <span className="text-3xl">📚</span>
          <div className="flex-1">
            <div className="font-bold text-gray-900">{t("chapters")}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {chs.length} chapters · flashcards or quiz per chapter
            </div>
          </div>
        </button>
        {hasVocab&&<button onClick={()=>setScreen("vocab_cats")}
          className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
          style={{borderLeftColor:color}}>
          <span className="text-3xl">📇</span>
          <div className="flex-1">
            <div className="font-bold text-gray-900">Vocabulary Cards</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {vocabCards.length} terms · EN + FR · swipe left/right
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color}}>{vocabCards.length}</span>
        </button>}
        <div className="mt-2">
          <SourceBadge catId={cat.id}/>
        </div>
      </div>
    </div>
  );
}

// ── Exam hub (info + schedule + source + study) ───────────────────────────────
function ExamHub({cat,onStudy,onBack}:{cat:Cat;onStudy:()=>void;onBack:()=>void}){
  const t=useT();
  const meta=META[cat.id];
  const src=SOURCE[cat.id];
  const count=(ALL[cat.id]||[]).length;
  const vocabCount=(VOCAB[cat.id]||[]).length;
  if(!meta)return null;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-10 pb-6" style={{background:`linear-gradient(135deg,${cat.color} 0%,${cat.color}cc 100%)`}}>
        <button onClick={onBack} className="text-white/70 hover:text-white text-sm mb-4 block">← All Certifications</button>
        <div className="text-4xl mb-2">{cat.emoji}</div>
        <h1 className="text-2xl font-black text-white mb-1">{cat.title}</h1>
        <p className="text-white/80 text-sm leading-relaxed">{cat.description}</p>
      </div>
      <div className="max-w-lg mx-auto p-4 -mt-1 flex flex-col gap-4">
        {/* Exam info card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{t("examInfo")}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {([["fee",meta.fee],["studytime","—"],["where",meta.where],["when",meta.when]] as const).map(([k,v])=>(
              <div key={k}><div className="text-xs text-gray-400">{t(k)}</div>
              <div className="text-sm font-semibold text-gray-800 leading-tight">{v}</div></div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1">{t("schedule")}</div>
            <div className="text-sm font-semibold text-gray-800">{meta.schedule}</div>
          </div>
          {meta.feeNote&&<p className="text-xs text-gray-400 mt-2">{meta.feeNote}</p>}
          {meta.renewNote&&<p className="text-xs text-blue-600 mt-1 font-medium">🔄 {meta.renewNote}</p>}
        </div>

        {/* Official links */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("officialLinks")}</h3>
          {[{icon:"📅",label:t("schedule"),url:meta.scheduleUrl},
            {icon:"📖",label:"Study guide",url:meta.studyUrl},
            {icon:"🏛",label:"Official info",url:meta.officialUrl},
            ...(cat.id==="interpreter"?[{icon:"📝",label:"Official sample test (75 Qs, 90 min)",
              url:"https://www.surveygizmo.com/s3/4612658/Per-Diem-Court-Interpreter-Sample-Test"}]:[]),
          ].map(({icon,label,url})=>(
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 -mx-1 group">
              <span className="text-lg">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-400 truncate">{url.replace("https://","").split("/")[0]}</div>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500">→</span>
            </a>
          ))}
        </div>

        {/* Source badge */}
        {src&&<SourceBadge catId={cat.id}/>}

        {/* Study CTA */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t("practiceWith")}</h3>
          <p className="text-xs text-gray-500 mb-4">
            {count} {t("qs")}{vocabCount?` · ${vocabCount} ${t("vocab")}`:""}
            {" · "}{CHAPTERS[cat.id]?.length||0} chapters · 3 difficulty levels
          </p>
          <button onClick={onStudy}
            className="w-full py-4 rounded-xl font-black text-white text-base hover:opacity-90"
            style={{backgroundColor:cat.color}}>
            {t("startStudying")}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center px-4 pb-4 leading-relaxed">{t("practiceOnly")}</p>
      </div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function HomeScreen(){
  const t=useT();
  type S="home"|"hub"|"study";
  const [screen,setScreen]=useState<S>("home");
  const [active,setActive]=useState<Cat|null>(null);
  const fullCat=active?{...active,...(META[active.id]||{})}:null;
  function open(cat:Cat){setActive(cat);setScreen("hub");trackCertOpen(cat.id);}
  if(screen==="hub"&&active)return<ExamHub cat={active} onStudy={()=>setScreen("study")} onBack={()=>setScreen("home")}/>;
  if(screen==="study"&&fullCat)return<StudyHub
    cat={fullCat as Cat&{color:string;bg:string}}
    hasVocab={!!(VOCAB[fullCat.id]?.length)}
    onBack={()=>setScreen("hub")}/>;
  const total=certData.categories.reduce((s,c)=>s+c.count,0);
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-10 pb-6" style={{background:"linear-gradient(135deg,#003087 0%,#0052A5 100%)"}}>
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-3xl font-black text-white mb-1">Jàng NYC</h1>
          <p className="text-blue-200 text-sm font-semibold mb-1">{t("tagline")}</p>
          <p className="text-blue-300 text-xs leading-relaxed">{t("subtitle")}</p>
        </div>
      </div>
      <LangBar/>
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex gap-3 text-xs text-gray-500 flex-wrap">
          <span><span className="font-bold text-gray-900">{total}</span> {t("qs")}</span>
          <span>📇 swipe flashcards</span><span>📝 chapter quizzes</span>
          <span>🟢🟡🔴 3 levels</span><span className="font-bold text-green-600">{t("free")}</span>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">NYC Licenses &amp; Certifications</p>
        {certData.categories.map(cat=>{
          const meta=META[cat.id];
          const src=SOURCE[cat.id];
          return(
            <button key={cat.id} onClick={()=>open(cat)}
              className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all"
              style={{borderLeftWidth:4,borderLeftColor:cat.color}}>
              <div className="p-4 flex items-center gap-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{cat.title}</span>
                    {src&&<span className={`text-xs px-1.5 py-0.5 rounded font-bold ${src.official?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                      {src.official?"✅ Official":"⚠️ Practice"}
                    </span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</div>
                </div>
              </div>
              {/* Actionable exam info strip */}
              {meta&&<div className="px-4 pb-3 pt-0 border-t border-gray-50 grid grid-cols-3 gap-2">
                <div><div className="text-xs text-gray-400">Fee</div><div className="text-xs font-bold text-gray-700">{meta.fee}</div></div>
                <div><div className="text-xs text-gray-400">Where</div><div className="text-xs font-bold text-gray-700 truncate">{meta.where.split("—")[0].trim()}</div></div>
                <div><div className="text-xs text-gray-400">When</div><div className="text-xs font-bold text-gray-700 truncate">{meta.when.split("·")[0].split("—")[0].trim()}</div></div>
              </div>}
            </button>
          );
        })}
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-xs text-gray-400 leading-relaxed">
          {t("practiceOnly")}<br/>
          <span className="font-medium">Jàng</span> (Wolof: to study) · also available as a mobile app
        </p>
      </div>
    </div>
  );
}

export default function Home(){
  const [lang,setLang]=useState<Lang>("en");
  return(
    <LangCtx.Provider value={{lang,setLang}}>
      <HomeScreen/>
    </LangCtx.Provider>
  );
}
