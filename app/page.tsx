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

// ── Source registry ───────────────────────────────────────────────────────────
const SOURCE:Record<string,{label:string;url:string;official:boolean;note?:string}> = {
  interpreter:{label:"NYS Court Interpreter Sample Questions (PDF)",url:"https://www.nycourts.gov/legacyPDFs/English%20Language%20Proficiency%20Sample%20Questions.pdf",official:true},
  security:   {label:"NYS Security Guard Manual — DCJS / Security Guard Act 1992",url:"https://www.radianttraining.com/training/security_manual.pdf",official:true},
  dmv:        {label:"NYS Driver's Manual — NYS DMV",url:"https://dmv.ny.gov/driver-license/get-driver-license-0",official:true},
  civics:     {label:"USCIS 100 Civics Questions for Naturalization",url:"https://www.uscis.gov/citizenship/find-study-materials-and-resources",official:true},
  fdny:       {label:"FDNY Certificate of Fitness Study Guides",url:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",official:false,note:"⚠️ Questions need verification against official FDNY materials."},
  cna:        {label:"ATI TEAS / State CNA competency standards",url:"https://www.pearsonvue.com/us/en/nclex.html",official:false,note:"⚠️ Questions need verification against official Pearson VUE / state nursing board materials."},
  hha:        {label:"NYS DOH HHA training standards",url:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",official:false,note:"⚠️ Questions need verification against official NYS DOH HHA curriculum."},
  teas:       {label:"ATI TEAS official practice",url:"https://www.atitesting.com/teas/study",official:false,note:"⚠️ Questions need verification against official ATI TEAS materials."},
  food_protection:{label:"NYC DOHMH Food Protection Course (free online)",url:"https://www.nyc.gov/site/doh/business/health-academy/food-protection-online-free.page",official:true},
};

// ── Exam metadata ─────────────────────────────────────────────────────────────
const META:Record<string,{fee:string;feeNote:string;where:string;when:string;schedule:string;scheduleUrl:string;studyUrl:string;officialUrl:string;renewNote?:string;}> = {
  fdny:{fee:"$25 – $45",feeNote:"F-01: $25 · F-03: $35 · G-60: $45",where:"FDNY HQ — 9 MetroTech Center, Brooklyn",when:"Mon – Fri, 8 AM – 3 PM (walk-in)",schedule:"Walk-in, no appointment needed",scheduleUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",studyUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",officialUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",renewNote:"Certificate of Fitness expires — renewal exam required"},
  cna:{fee:"$180 – $220",feeNote:"Pearson VUE exam fee — many training programs cover it",where:"Pearson VUE testing centers across NYC",when:"Scheduled through Pearson VUE — multiple dates available",schedule:"Book at Pearson VUE online after completing your 75-hour training program",scheduleUrl:"https://www.pearsonvue.com/us/en/nclex.html",studyUrl:"https://www.ncsbn.org/nclex",officialUrl:"https://www.health.ny.gov/health_care/medicaid/",renewNote:"CNA registration — renew every 2 years with documented work hours"},
  hha:{fee:"$0 – $50",feeNote:"Usually covered by your 75-hour HHA training program",where:"Through your DCJS-approved HHA training program provider",when:"Scheduled after completing 75-hour training program",schedule:"Contact your training program to schedule the competency evaluation",scheduleUrl:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",studyUrl:"https://www.health.ny.gov/facilities/home_care/",officialUrl:"https://www.health.ny.gov/facilities/home_care/aide_training.htm"},
  teas:{fee:"$115",feeNote:"ATI TEAS exam fee — check if your nursing school covers retakes",where:"Your nursing school or an ATI authorized testing center",when:"Multiple testing dates — check ATI's website",schedule:"Register at atitesting.com — select your school and a testing date",scheduleUrl:"https://www.atitesting.com/teas/register",studyUrl:"https://www.atitesting.com/teas/study",officialUrl:"https://www.atitesting.com/teas"},
  interpreter:{fee:"~$200",feeNote:"NYS Unified Court System exam fee",where:"111 Centre Street, Manhattan — Room 1189",when:"Scheduled exams — check nycourts.gov for upcoming dates",schedule:"Register through the NYS Unified Court System — written + oral exam required",scheduleUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",studyUrl:"https://www.nycourts.gov/legacyPDFs/English%20Language%20Proficiency%20Sample%20Questions.pdf",officialUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",renewNote:"Re-registration required every 2 years with continuing education"},
  dmv:{fee:"$80",feeNote:"Includes learner permit + first road test attempt",where:"Any NYC DMV office — appointments recommended",when:"DMV offices open Mon – Fri — book online at dmv.ny.gov",schedule:"Schedule at dmv.ny.gov or call (518) 486-9786",scheduleUrl:"https://dmv.ny.gov/office-visit/find-dmv-office-or-kiosk",studyUrl:"https://dmv.ny.gov/driver-license/get-driver-license-0",officialUrl:"https://dmv.ny.gov/learners-permit",renewNote:"Driver license — renew every 8 years (standard) or 5 years (enhanced)"},
  security:{fee:"$36 – $108",feeNote:"Unarmed: ~$36 · Armed: ~$108 (NYS Dept. of State)",where:"DCJS-approved training schools only",when:"Training schools set their own schedules",schedule:"Complete 8-hr pre-assignment training → apply through NYS Dept. of State",scheduleUrl:"https://www.dos.ny.gov/licensing/security_guard/index.html",studyUrl:"https://www.criminaljustice.ny.gov/ops/sgtraining/sgpquestion.htm",officialUrl:"https://www.dos.ny.gov/licensing/security_guard/index.html",renewNote:"Registration valid 2 years — DOS-2012 (unarmed) or DOS-1246 (armed)"},
  civics:{fee:"$725",feeNote:"N-400 Application for Naturalization filing fee",where:"USCIS field office — after application approval",when:"Scheduled by USCIS after N-400 review",schedule:"File N-400 → biometrics → interview → oath ceremony",scheduleUrl:"https://www.uscis.gov/citizenship/apply-for-citizenship",studyUrl:"https://www.uscis.gov/citizenship/find-study-materials-and-resources",officialUrl:"https://www.uscis.gov/citizenship",renewNote:"U.S. citizenship is permanent — no renewal required"},
  food_protection:{fee:"$24",feeNote:"Exam fee · Online course is free · Classroom option: $16",where:"NYC Health Academy — Riverside Health Center, 160 West 100th St, Manhattan",when:"By appointment — register after completing the free online course",schedule:"Complete the free 15-lesson online course at nyc.gov, then register and pay $24 for the in-person final exam",scheduleUrl:"https://www.nyc.gov/site/doh/business/health-academy/food-protection-online-free.page",studyUrl:"https://www.nyc.gov/site/doh/business/health-academy/food-protection-online-free.page",officialUrl:"https://www.nyc.gov/site/doh/business/health-academy/food-protection-course.page",renewNote:"Certificate valid 5 years — renewal exam required"},
};

// ── Chapters per certification ─────────────────────────────────────────────────
const CHAPTERS:Record<string,string[]> = {
  fdny:    ["Fire Guard Basics","Fire Watch Duties","Emergency Procedures","Fire Prevention","Building Systems"],
  cna:     ["Infection Control","Safety & Emergency","Basic Nursing Care","Mental Health","Patient Rights"],
  hha:     ["Personal Care","Safety & Environment","Communication","Patient Rights","Nutrition"],
  teas:    ["Reading Comprehension","Math & Data","Science","English Language"],
  interpreter:["A — Sentence Completion","B — Paragraph Comprehension","C — Grammar & Usage","D — Vocabulary Synonyms","E — Vocabulary Antonyms","F — Idiomatic Expressions","G — Legal Terminology"],
  dmv:     ["Traffic Laws","Road Signs & Signals","Right of Way","Driving Skills","Alcohol & Drugs"],
  security:["1 — Role of a Guard","2 — Legal Powers","3 — Emergencies","4 — Communications","5 — Access Control","6 — Ethics","7 — Reports","8 — Notes","9 — Patrol","NYS — Licensing"],
  civics:  ["Democracy Principles","System of Government","Rights & Responsibilities","Colonial & Independence","Civil War Era","Modern History","Geography & Symbols"],
  food_protection:["Health Code & Introduction","Food Safety Fundamentals","Receiving Foods","Storage","Hazards","Food Allergies","Microbiology — Bacteria","Microorganisms","Foodborne Illnesses","Personal Hygiene","Food Preparation","Cooking Temperatures","Hot Holding, Cooling & Reheating","Cleaning & Sanitizing","HACCP","Pest Control"],
};

function chOf(id:string,i:number,total:number){
  const chs=CHAPTERS[id]||["General"];
  return chs[Math.min(Math.floor((i/total)*chs.length),chs.length-1)];
}

// ── Subcert helpers ───────────────────────────────────────────────────────────
function getSubcerts(catId:string):string[]{
  const qs=ALL[catId]||[];
  const secs=[...new Set(qs.map(q=>q.section).filter(Boolean))].sort() as string[];
  return secs.length>1?secs:(CHAPTERS[catId]||["All"]);
}
function getSubcertQs(catId:string,subcert:string):Q[]{
  const qs=ALL[catId]||[];
  const hasSec=qs.some(q=>q.section);
  if(hasSec){const by=qs.filter(q=>q.section===subcert);if(by.length>0)return by;}
  return qs.filter((_,i)=>chOf(catId,i,qs.length)===subcert);
}
function getChaptersForSubcert(catId:string,subcertQs:Q[],allQs:Q[]):{id:string;label:string;count:number}[]{
  const map:Record<string,number>={};
  subcertQs.forEach(q=>{
    const i=allQs.indexOf(q);
    const ch=chOf(catId,i<0?0:i,allQs.length);
    map[ch]=(map[ch]||0)+1;
  });
  return Object.entries(map).map(([id,count])=>({id,label:id,count}));
}

// ── UI strings ────────────────────────────────────────────────────────────────
const UI:Record<Lang,Record<string,string>> = {
  en:{tagline:"Free License & Certification Prep · NYC",
    subtitle:"Tap any certification — then study with flashcards or timed practice tests.",
    examInfo:"Exam info",fee:"Fee",studytime:"Study time",where:"Where",when:"When",schedule:"How to schedule",
    officialLinks:"Official links",practiceWith:"Practice for free",
    unofficialNote:"Practice questions — verify against official source before your exam.",
    qs:"questions",vocab:"Vocab cards",free:"Free",
    selectTopic:"Select a topic to study",
    flashcards:"Flashcards",practiceTest:"Practice Test",
    chapters:"Topics",allDeck:"All cards",diffTitle:"Choose difficulty",
    easy:"Easy",medium:"Medium",hard:"Hard",ascending:"Ascending",
    easyD:"Foundations — start here",medD:"Core material",hardD:"Advanced — exam ready",ascD:"Easy → Medium → Hard (all questions)",
    tapFlip:"Tap card to flip",swipeHint:"← swipe or tap arrows →",
    gotIt:"✓ Know it",again:"↺ Review",done:"Done!",restart:"Restart",back:"← Back",
    next:"Next →",results:"See Results",correct:"✓ Correct",wrong:"✗ Incorrect",why:"Why",
    pass:"Passed ✓",fail:"Not yet — keep studying",bookNow:"📅 Schedule your exam →",
    studyMore:"← Study more",practiceOnly:"Practice only — always verify with the official source before your exam.",
    readFirst:"Read the passage, then answer",topics:"☰ Topics",
    sourceBadge:"Source",officialSource:"Official source",practiceSource:"Practice — needs official source verification",
  },
  fr:{tagline:"Préparation gratuite aux licences et certifications · NYC",
    subtitle:"Appuyez sur une certification — étudiez avec des cartes ou des quiz.",
    examInfo:"Infos examen",fee:"Frais",studytime:"Durée d'étude",where:"Lieu",when:"Quand",schedule:"Comment s'inscrire",
    officialLinks:"Liens officiels",practiceWith:"S'entraîner gratuitement",
    unofficialNote:"Questions d'entraînement — vérifiez avec la source officielle avant votre examen.",
    qs:"questions",vocab:"Fiches vocab",free:"Gratuit",
    selectTopic:"Choisir un sujet",
    flashcards:"Fiches",practiceTest:"Test pratique",
    chapters:"Sujets",allDeck:"Tout le jeu",diffTitle:"Choisir la difficulté",
    easy:"Facile",medium:"Moyen",hard:"Difficile",ascending:"Progressif",
    easyD:"Bases — commencez ici",medD:"Matière principale",hardD:"Avancé",ascD:"Facile → Moyen → Difficile",
    tapFlip:"Appuyez pour retourner",swipeHint:"← balayez ou flèches →",
    gotIt:"✓ Je sais",again:"↺ Revoir",done:"Terminé !",restart:"Recommencer",back:"← Retour",
    next:"Suivant →",results:"Voir les résultats",correct:"✓ Correct",wrong:"✗ Incorrect",why:"Pourquoi",
    pass:"Réussi ✓",fail:"Pas encore — continuez !",bookNow:"📅 Réserver votre examen →",
    studyMore:"← Étudier encore",practiceOnly:"Entraînement uniquement — vérifiez toujours avec la source officielle.",
    readFirst:"Lisez le passage, puis répondez",topics:"☰ Sujets",
    sourceBadge:"Source",officialSource:"Source officielle",practiceSource:"Entraînement — vérification requise",
  },
  es:{tagline:"Preparación gratuita para licencias y certificaciones · NYC",
    subtitle:"Toque una certificación — estudie con tarjetas o cuestionarios.",
    examInfo:"Info del examen",fee:"Tarifa",studytime:"Tiempo de estudio",where:"Lugar",when:"Cuándo",schedule:"Cómo inscribirse",
    officialLinks:"Enlaces oficiales",practiceWith:"Practica gratis",
    unofficialNote:"Preguntas de práctica — verifique con la fuente oficial antes del examen.",
    qs:"preguntas",vocab:"Tarjetas vocab",free:"Gratis",
    selectTopic:"Seleccionar un tema",
    flashcards:"Tarjetas",practiceTest:"Examen práctico",
    chapters:"Temas",allDeck:"Mazo completo",diffTitle:"Elegir dificultad",
    easy:"Fácil",medium:"Medio",hard:"Difícil",ascending:"Ascendente",
    easyD:"Fundamentos — empiece aquí",medD:"Material principal",hardD:"Avanzado",ascD:"Fácil → Medio → Difícil",
    tapFlip:"Toque para voltear",swipeHint:"← deslice o use flechas →",
    gotIt:"✓ Lo sé",again:"↺ Repasar",done:"¡Terminado!",restart:"Reiniciar",back:"← Atrás",
    next:"Siguiente →",results:"Ver resultados",correct:"✓ Correcto",wrong:"✗ Incorrecto",why:"Por qué",
    pass:"Aprobado ✓",fail:"Siga estudiando",bookNow:"📅 Reservar examen →",
    studyMore:"← Estudiar más",practiceOnly:"Solo práctica — verifique siempre con la fuente oficial.",
    readFirst:"Lea el texto y responda",topics:"☰ Temas",
    sourceBadge:"Fuente",officialSource:"Fuente oficial",practiceSource:"Práctica — requiere verificación",
  },
  pt:{tagline:"Preparação gratuita para licenças e certificações · NYC",
    subtitle:"Toque em uma certificação — estude com cartões ou questionários.",
    examInfo:"Info do exame",fee:"Taxa",studytime:"Tempo de estudo",where:"Local",when:"Quando",schedule:"Como se inscrever",
    officialLinks:"Links oficiais",practiceWith:"Praticar de graça",
    unofficialNote:"Perguntas de prática — verifique com a fonte oficial antes do exame.",
    qs:"perguntas",vocab:"Cartões vocab",free:"Grátis",
    selectTopic:"Selecionar um tópico",
    flashcards:"Cartões",practiceTest:"Teste prático",
    chapters:"Tópicos",allDeck:"Baralho completo",diffTitle:"Escolher dificuldade",
    easy:"Fácil",medium:"Médio",hard:"Difícil",ascending:"Ascendente",
    easyD:"Fundamentos — comece aqui",medD:"Material principal",hardD:"Avançado",ascD:"Fácil → Médio → Difícil",
    tapFlip:"Toque para virar",swipeHint:"← deslize ou use setas →",
    gotIt:"✓ Sei",again:"↺ Revisar",done:"Concluído!",restart:"Reiniciar",back:"← Voltar",
    next:"Próximo →",results:"Ver resultados",correct:"✓ Correto",wrong:"✗ Incorreto",why:"Por que",
    pass:"Aprovado ✓",fail:"Continue estudando",bookNow:"📅 Agendar exame →",
    studyMore:"← Estudar mais",practiceOnly:"Apenas prática — verifique sempre com a fonte oficial.",
    readFirst:"Leia o texto e responda",topics:"☰ Tópicos",
    sourceBadge:"Fonte",officialSource:"Fonte oficial",practiceSource:"Prática — requer verificação",
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

// ── Source badge — shows study source link without "official/unofficial" labels ──
function SourceBadge({catId}:{catId:string}){
  const src=SOURCE[catId];
  if(!src) return null;
  return(
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed bg-blue-50 border border-blue-200">
      <span>📚</span>
      <div>
        <span className="font-bold text-blue-800">Study material — </span>
        <a href={src.url} target="_blank" rel="noopener noreferrer"
          className="underline text-blue-700">{src.label}</a>
        {src.note&&<p className="text-blue-700 mt-1">{src.note}</p>}
      </div>
    </div>
  );
}

// ── Flashcard deck ────────────────────────────────────────────────────────────
function FlashDeck({cards,startIdx,onBack,topRight}:{
  cards:{front:string;back:string;backFr?:string;example?:string}[];
  startIdx:number;
  onBack:()=>void;
  topRight?:React.ReactNode;
}){
  const {lang}=useLang();
  const t=useT();
  const [idx,setIdx]=useState(startIdx);
  const [flipped,setFlipped]=useState(false);
  const touchX=useRef<number|null>(null);
  const card=cards[idx];

  function goNext(){if(idx<cards.length-1){setIdx(i=>i+1);setFlipped(false);}}
  function goPrev(){if(idx>0){setIdx(i=>i-1);setFlipped(false);}}
  function onTouchStart(e:React.TouchEvent){touchX.current=e.touches[0].clientX;}
  function onTouchEnd(e:React.TouchEvent){
    if(touchX.current===null)return;
    const dx=e.changedTouches[0].clientX-touchX.current;
    if(Math.abs(dx)>50){dx<0?goNext():goPrev();}
    touchX.current=null;
  }
  const back=lang==="fr"&&card.backFr?`${card.backFr}\n\nEN: ${card.back}`:card.back;

  return(
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-bold text-lg">←</button>
        <div className="flex-1 text-sm text-gray-500">{idx+1} / {cards.length}</div>
        {topRight}
        <LangBar/>
      </div>
      <div className="h-0.5 bg-gray-100"><div className="h-full bg-blue-500 transition-all" style={{width:`${((idx+1)/cards.length)*100}%`}}/></div>
      <div className="flex-1 flex flex-col items-center justify-center p-4"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button onClick={()=>setFlipped(f=>!f)}
          className="w-full max-w-md min-h-64 bg-white rounded-2xl shadow-md p-6 text-left active:scale-[0.99] transition-all relative">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400 block mb-4">
            {flipped?"Answer — tap to see question again":"Question — tap to reveal answer"}
          </span>
          {!flipped?(
            <p className="text-xl font-bold text-gray-900 leading-snug">{card.front}</p>
          ):(
            <div>
              <p className="text-lg font-semibold text-gray-900 leading-relaxed whitespace-pre-line">{back}</p>
              {card.example&&<p className="text-sm text-blue-600 italic mt-3">"{card.example}"</p>}
            </div>
          )}
          {!flipped&&<div className="absolute bottom-4 right-4 text-3xl text-gray-200">↺</div>}
        </button>
        <div className="flex items-center gap-4 mt-6 w-full max-w-md justify-between">
          <button onClick={goPrev} disabled={idx===0}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${idx===0?"bg-gray-100 text-gray-300":"bg-white shadow text-gray-700 hover:bg-gray-50 active:scale-95"}`}>←</button>
          <p className="text-xs text-gray-400">{t("swipeHint")}</p>
          <button onClick={goNext} disabled={idx===cards.length-1}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${idx===cards.length-1?"bg-gray-100 text-gray-300":"bg-white shadow text-gray-700 hover:bg-gray-50 active:scale-95"}`}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Vocab browser ─────────────────────────────────────────────────────────────
function VocabBrowser({catId,filter,color,onBack}:{catId:string;filter:string|null;color:string;onBack:()=>void}){
  const {lang}=useLang();
  const cards=(VOCAB[catId]||[]).filter(c=>!filter||c.category===filter);
  const [startIdx,setStartIdx]=useState<number|null>(null);
  if(startIdx!==null){
    const dc=cards.map(c=>({front:c.term,back:c.definition_en,backFr:c.definition_fr,example:c.example}));
    return<FlashDeck cards={dc} startIdx={startIdx} onBack={()=>setStartIdx(null)}/>;
  }
  const categoryLabel=(cat:string)=>({vocabulary:"📖 Vocabulary",idiom:"🗣 Idioms",legal:"⚖️ Legal"})[cat]||cat;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 font-bold text-lg">←</button>
        <div className="flex-1 font-bold text-gray-900 text-sm">{filter?categoryLabel(filter):"All vocabulary"} · {cards.length} cards</div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        <p className="text-xs text-gray-400 mb-3 px-1">Tap any word to start — then swipe to browse</p>
        {cards.length===0&&<p className="text-gray-400 text-center py-8">No cards in this set.</p>}
        <div className="flex flex-col gap-2">
          {cards.map((card,i)=>(
            <button key={card.id} onClick={()=>setStartIdx(i)}
              className="w-full text-left bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.99] transition-all flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:color}}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm">{card.term}</div>
                <div className="text-xs text-gray-400 truncate">{lang==="fr"?card.definition_fr:card.definition_en}</div>
              </div>
              <span className="text-gray-300 text-lg shrink-0">→</span>
            </button>
          ))}
        </div>
        {cards.length>0&&(
          <button onClick={()=>setStartIdx(0)} className="w-full mt-4 py-3 rounded-xl font-bold text-white text-center" style={{backgroundColor:color}}>
            Start from beginning →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Flashcard category list + deck with sidebar drawer ────────────────────────
function FlashCategoryView({cat,subcert,onBack}:{
  cat:Cat&{color:string;bg:string};
  subcert:string|null;
  onBack:()=>void;
}){
  const {lang}=useLang();
  const t=useT();
  const allQs=ALL[cat.id]||[];
  const subcertQs=useMemo(()=>subcert?getSubcertQs(cat.id,subcert):allQs,[cat.id,subcert,allQs]);
  const chapters=useMemo(()=>getChaptersForSubcert(cat.id,subcertQs,allQs),[cat.id,subcertQs,allQs]);

  const [activeCh,setActiveCh]=useState<string|null>(null);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [deckKey,setDeckKey]=useState(0);

  const deckCards=useMemo(()=>{
    const pool=activeCh
      ?subcertQs.filter(q=>chOf(cat.id,allQs.indexOf(q)<0?0:allQs.indexOf(q),allQs.length)===activeCh)
      :subcertQs;
    return pool.map(q=>{
      const i=allQs.indexOf(q);
      const tq=tQ(cat.id,i<0?0:i,q,lang);
      return{front:tq.q,back:tq.choices[q.answer]||"",example:tq.exp};
    });
  },[activeCh,subcertQs,allQs,cat.id,lang]);

  function selectCh(ch:string|null){setActiveCh(ch);setDeckKey(k=>k+1);setDrawerOpen(false);}

  // Category list view
  if(activeCh===null&&!drawerOpen){
    return(
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
          <button onClick={onBack} className="text-white/80 font-bold text-lg">←</button>
          <div className="flex-1 text-white font-bold text-sm truncate">{subcert||cat.title} — {t("flashcards")}</div>
        </div>
        <div className="max-w-lg mx-auto p-4">
          <p className="text-xs text-gray-400 mb-3 px-1">Select a topic — topics stay accessible while you study</p>
          {/* All cards */}
          <button onClick={()=>selectCh(null)}
            className="w-full text-left bg-white rounded-2xl p-4 mb-3 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3"
            style={{borderLeftColor:cat.color}}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0" style={{backgroundColor:cat.color}}>★</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">All questions</div>
              <div className="text-xs text-gray-400">{subcertQs.length} flashcards</div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color:cat.color}}>{subcertQs.length}</span>
          </button>
          {/* Chapter cards */}
          <div className="flex flex-col gap-2">
            {chapters.map((ch,i)=>(
              <button key={ch.id} onClick={()=>selectCh(ch.id)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3"
                style={{borderLeftColor:cat.color}}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:cat.color}}>{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm leading-tight">{ch.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{ch.count} flashcards</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{backgroundColor:cat.bg,color:cat.color}}>{ch.count}</span>
              </button>
            ))}
          </div>
          {subcertQs.length>0&&(
            <button onClick={()=>selectCh(null)} className="w-full mt-4 py-3 rounded-xl font-bold text-white" style={{backgroundColor:cat.color}}>
              Start all {subcertQs.length} cards →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Deck view with slide-in topics drawer
  const topicsBtn=(
    <button onClick={()=>setDrawerOpen(true)}
      className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors whitespace-nowrap">
      {t("topics")}
    </button>
  );

  return(
    <div className="relative">
      <FlashDeck key={deckKey} cards={deckCards} startIdx={0} onBack={()=>setActiveCh(null)} topRight={topicsBtn}/>

      {/* Topics drawer */}
      {drawerOpen&&(
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={()=>setDrawerOpen(false)}/>
          <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between" style={{backgroundColor:cat.color}}>
              <span className="text-white font-bold">{t("topics")}</span>
              <button onClick={()=>setDrawerOpen(false)} className="text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              {/* All option */}
              <button onClick={()=>selectCh(null)}
                className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all"
                style={activeCh===null?{backgroundColor:cat.bg}:{backgroundColor:"#f9fafb"}}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:cat.color}}>★</span>
                <div>
                  <div className="text-sm font-bold text-gray-900">All questions</div>
                  <div className="text-xs text-gray-400">{subcertQs.length} cards</div>
                </div>
                {activeCh===null&&<span className="ml-auto text-xs font-bold" style={{color:cat.color}}>● Now</span>}
              </button>
              {chapters.map((ch,i)=>(
                <button key={ch.id} onClick={()=>selectCh(ch.id)}
                  className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all"
                  style={activeCh===ch.id?{backgroundColor:cat.bg}:{backgroundColor:"#f9fafb"}}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:cat.color}}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 leading-tight">{ch.label}</div>
                    <div className="text-xs text-gray-400">{ch.count} cards</div>
                  </div>
                  {activeCh===ch.id&&<span className="ml-auto text-xs font-bold shrink-0" style={{color:cat.color}}>● Now</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function Quiz({cat,diff,chapter,subcert,onBack}:{
  cat:Cat&{color:string;bg:string};
  diff:Diff|"ascending";
  chapter:string|null;
  subcert:string|null;
  onBack:()=>void;
}){
  const {lang}=useLang();
  const t=useT();
  const allQs=ALL[cat.id]||[];
  const qs=useMemo(()=>{
    let pool=allQs.map((q,i)=>({...q,_i:i,_ch:chOf(cat.id,i,allQs.length)}));
    // Filter to subcert
    if(subcert){
      const hasSec=allQs.some(q=>q.section);
      if(hasSec) pool=pool.filter(q=>q.section===subcert);
      else pool=pool.filter(q=>q._ch===subcert);
    }
    // Filter to chapter
    if(chapter) pool=pool.filter(q=>q._ch===chapter);
    // Apply difficulty
    if(diff==="ascending"){
      const order:Record<string,number>={easy:0,medium:1,hard:2};
      pool=[...pool].sort((a,b)=>(order[a.difficulty||"medium"]??1)-(order[b.difficulty||"medium"]??1));
    } else if(diff==="easy"){
      pool=pool.filter(q=>q.difficulty==="easy"||!q.difficulty);
    } else if(diff==="medium"){
      pool=pool.filter(q=>q.difficulty!=="hard");
    } else {
      // hard: take last portion or difficulty=hard
      const hard=pool.filter(q=>q.difficulty==="hard");
      if(hard.length>=5) pool=hard;
      else pool=pool.slice(-Math.min(15,pool.length));
    }
    return diff==="ascending"?pool:pool.slice(0,15);
  },[allQs,cat.id,diff,chapter,subcert]);

  const [idx,setIdx]=useState(0);
  const [picked,setPicked]=useState<number|null>(null);
  const [score,setScore]=useState(0);
  const [done,setDone]=useState(false);
  const meta=META[cat.id];
  const _q=qs[idx];
  const q=_q?{..._q,...tQ(cat.id,_q._i,_q,lang)}:undefined;

  useEffect(()=>{if(done)trackQuizFinish(cat.id,score,qs.length);},[done]); // eslint-disable-line

  function choose(i:number){
    if(picked!==null||!_q)return;
    const correct=i===_q.answer;
    setPicked(i);
    if(correct)setScore(s=>s+1);
    trackQuizAnswer(cat.id,idx,correct);
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
          <h2 className="text-2xl font-black mb-1" style={{color:pass?"#16a34a":cat.color}}>{pass?t("pass"):t("fail")}</h2>
          <p className="text-gray-500 mb-4">{score}/{qs.length} · {pct}%</p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:pass?"#16a34a":cat.color}}/>
          </div>
          {meta&&<a href={pass?meta.scheduleUrl:meta.studyUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-white font-bold text-center mb-3 hover:opacity-90"
            style={{backgroundColor:cat.color}}>
            {pass?t("bookNow"):t("practiceWith")}
          </a>}
          <button onClick={onBack} className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-600">{t("studyMore")}</button>
          <p className="text-xs text-gray-400 mt-4">Practice material — study at your own pace.</p>
        </div>
      </div>
    );
  }
  if(!q)return null;

  const diffLabel=diff==="ascending"?"📈":diff==="easy"?"🟢":diff==="medium"?"🟡":"🔴";
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={()=>{if(!done)trackQuizExit(cat.id,idx,qs.length);onBack();}} className="text-white/80 font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm truncate">{chapter||subcert||cat.title}</div>
          <div className="text-white/70 text-xs">{diffLabel} {idx+1}/{qs.length}</div>
        </div>
        <div className="text-white font-bold">{score}/{idx+(picked!==null?1:0)}</div>
      </div>
      <div className="h-1 bg-gray-100">
        <div className="h-full transition-all" style={{width:`${((idx+(picked!==null?1:0))/qs.length)*100}%`,backgroundColor:cat.color}}/>
      </div>
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

// ── Difficulty selector ───────────────────────────────────────────────────────
function DiffScreen({cat,chapter,subcert,onPick,onBack}:{
  cat:Cat&{color:string;bg:string};
  chapter:string|null;
  subcert:string|null;
  onPick:(d:Diff|"ascending")=>void;
  onBack:()=>void;
}){
  const t=useT();
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold truncate">{chapter||subcert||cat.title} · {t("diffTitle")}</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6 flex flex-col gap-3">
        {([
          ["easy","🟢","easy","easyD"],
          ["medium","🟡","medium","medD"],
          ["hard","🔴","hard","hardD"],
          ["ascending","📈","ascending","ascD"],
        ] as const).map(([d,e,lk,dk])=>(
          <button key={d} onClick={()=>{trackQuizStart(cat.id,chapter||subcert,d==="ascending"?"ascending":d);onPick(d);}}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 flex items-center gap-4 active:scale-[0.99] transition-all">
            <span className="text-3xl">{e}</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{t(lk)}</div>
              <div className="text-sm text-gray-500">{t(dk)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Vocab hub (for court interpreter) ────────────────────────────────────────
function VocabHub({cat,onBack}:{cat:Cat&{color:string;bg:string};onBack:()=>void}){
  const t=useT();
  const {lang}=useLang();
  const vocabCards=VOCAB[cat.id]||[];
  const [filter,setFilter]=useState<string|null>(null);
  const [browsing,setBrowsing]=useState(false);
  if(browsing) return<VocabBrowser catId={cat.id} filter={filter} color={cat.color} onBack={()=>setBrowsing(false)}/>;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 font-bold text-lg">←</button>
        <div className="text-white font-bold">📇 Vocabulary Cards</div>
      </div>
      <div className="max-w-lg mx-auto p-4">
        <p className="text-xs text-gray-400 mb-3 px-1">Tap a set → see the word list → tap any word to start swiping</p>
        {[["","All vocabulary words",vocabCards.length],
          ["vocabulary","📖 General Vocabulary",vocabCards.filter(c=>c.category==="vocabulary").length],
          ["idiom","🗣 Idiomatic Expressions",vocabCards.filter(c=>c.category==="idiom").length],
          ["legal","⚖️ Legal Terms",vocabCards.filter(c=>c.category==="legal").length]].map(([f,label,n])=>(
          Number(n)===0?null:
          <button key={String(f)} onClick={()=>{setFilter(f?String(f):null);setBrowsing(true);trackVocabOpen(cat.id,f?String(f):null);}}
            className="w-full text-left bg-white rounded-2xl p-4 mb-2 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{borderLeftColor:cat.color}}>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{Number(n)} cards · EN + {lang==="fr"?"FR":"chosen language"}</div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color:cat.color}}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
function HomeScreen(){
  const t=useT();
  type S="home"|"subcerts"|"study_mode"|"flash"|"diff"|"quiz"|"vocab";
  const [screen,setScreen]=useState<S>("home");
  const [activeCat,setActiveCat]=useState<Cat|null>(null);
  const [subcert,setSubcert]=useState<string|null>(null);
  const [flashCh,setFlashCh]=useState<string|null>(null);
  const [diff,setDiff]=useState<Diff|"ascending">("medium");

  const cat=activeCat?{...activeCat}as Cat&{color:string;bg:string}:null;

  function openCert(c:Cat){setActiveCat(c);setScreen("subcerts");trackCertOpen(c.id);}
  function back(to:S){setScreen(to);}

  // ── Screens ──
  if(screen==="subcerts"&&cat){
    const subcerts=getSubcerts(cat.id);
    const allQs=ALL[cat.id]||[];
    const hasVocab=!!(VOCAB[cat.id]?.length);
    const meta=META[cat.id];
    const src=SOURCE[cat.id];
    return(
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-8 pb-5" style={{background:`linear-gradient(135deg,${cat.color} 0%,${cat.color}cc 100%)`}}>
          <button onClick={()=>back("home")} className="text-white/70 text-sm mb-3 block">← All Certifications</button>
          <div className="text-3xl mb-1">{cat.emoji}</div>
          <h1 className="text-2xl font-black text-white mb-0.5">{cat.title}</h1>
          <p className="text-white/75 text-sm leading-relaxed">{cat.description}</p>
        </div>
        <div className="max-w-lg mx-auto p-4">
          {/* Exam info strip */}
          {meta&&<div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div><div className="text-gray-400">Fee</div><div className="font-bold text-gray-800">{meta.fee}</div></div>
              <div><div className="text-gray-400">Where</div><div className="font-bold text-gray-800 truncate">{meta.where.split("—")[0].trim()}</div></div>
              <div><div className="text-gray-400">When</div><div className="font-bold text-gray-800 truncate">{meta.when.split("·")[0].split("—")[0].trim()}</div></div>
              <div className="flex items-end">
                <a href={meta.scheduleUrl} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90" style={{backgroundColor:cat.color}}>
                  📅 Schedule →
                </a>
              </div>
            </div>
            {meta.feeNote&&<p className="text-xs text-gray-400">{meta.feeNote}</p>}
            {meta.renewNote&&<p className="text-xs text-blue-600 mt-1 font-medium">🔄 {meta.renewNote}</p>}
          </div>}
          {/* Subcert tiles */}
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1 mb-2">{t("selectTopic")}</p>
          <div className="flex flex-col gap-2 mb-4">
            {subcerts.map((s,i)=>{
              const qCount=getSubcertQs(cat.id,s).length;
              return(
                <button key={s} onClick={()=>{setSubcert(s);back("study_mode");}}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border-l-4 p-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3"
                  style={{borderLeftColor:cat.color}}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0" style={{backgroundColor:cat.color}}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm">{s}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{qCount} questions</div>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </button>
              );
            })}
          </div>
          {/* Vocab entry (court interpreter) */}
          {hasVocab&&<button onClick={()=>back("vocab")}
            className="w-full text-left bg-white rounded-2xl p-4 mb-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{borderLeftColor:cat.color}}>
            <span className="text-2xl">📇</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Vocabulary Cards</div>
              <div className="text-xs text-gray-400">{VOCAB[cat.id]?.length||0} terms · EN + FR</div>
            </div>
          </button>}
          {src&&<SourceBadge catId={cat.id}/>}
          <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">{t("practiceOnly")}</p>
        </div>
      </div>
    );
  }

  if(screen==="vocab"&&cat){
    return<VocabHub cat={cat} onBack={()=>back("subcerts")}/>;
  }

  if(screen==="study_mode"&&cat&&subcert){
    const qCount=getSubcertQs(cat.id,subcert).length;
    return(
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-8 pb-5" style={{background:`linear-gradient(135deg,${cat.color} 0%,${cat.color}cc 100%)`}}>
          <button onClick={()=>back("subcerts")} className="text-white/70 text-sm mb-3 block">← {cat.title}</button>
          <div className="text-3xl mb-1">{cat.emoji}</div>
          <h1 className="text-xl font-black text-white mb-0.5">{subcert}</h1>
          <p className="text-white/75 text-sm">{qCount} questions</p>
        </div>
        <div className="max-w-lg mx-auto p-4 pt-5 flex flex-col gap-3">
          <button onClick={()=>{setFlashCh(null);back("flash");trackFlashcardOpen(cat.id,subcert);}}
            className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{borderLeftColor:cat.color}}>
            <span className="text-4xl">📇</span>
            <div className="flex-1">
              <div className="font-black text-gray-900 text-lg">{t("flashcards")}</div>
              <div className="text-sm text-gray-500 mt-0.5">Browse by topic — tap to flip, swipe to navigate</div>
            </div>
            <span className="text-gray-300 text-2xl">›</span>
          </button>
          <button onClick={()=>back("diff")}
            className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{borderLeftColor:cat.color}}>
            <span className="text-4xl">📝</span>
            <div className="flex-1">
              <div className="font-black text-gray-900 text-lg">{t("practiceTest")}</div>
              <div className="text-sm text-gray-500 mt-0.5">Easy · Medium · Hard · Ascending difficulty</div>
            </div>
            <span className="text-gray-300 text-2xl">›</span>
          </button>
          <SourceBadge catId={cat.id}/>
        </div>
      </div>
    );
  }

  if(screen==="flash"&&cat){
    return<FlashCategoryView cat={cat} subcert={subcert} onBack={()=>back("study_mode")}/>;
  }

  if(screen==="diff"&&cat){
    return<DiffScreen cat={cat} chapter={flashCh} subcert={subcert}
      onPick={d=>{setDiff(d);back("quiz");}}
      onBack={()=>back("study_mode")}/>;
  }

  if(screen==="quiz"&&cat){
    return<Quiz cat={cat} diff={diff} chapter={flashCh} subcert={subcert} onBack={()=>back("diff")}/>;
  }

  // ── Home ──
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
          <span>📇 flashcards</span><span>📝 practice tests</span>
          <span>🟢🟡🔴📈 4 levels</span>
          <span className="font-bold text-green-600">{t("free")}</span>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">NYC Licenses &amp; Certifications</p>
        {certData.categories.map(cat=>{
          const meta=META[cat.id];
          const src=SOURCE[cat.id];
          return(
            <button key={cat.id} onClick={()=>openCert(cat)}
              className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all"
              style={{borderLeftWidth:4,borderLeftColor:cat.color}}>
              <div className="p-4 flex items-center gap-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{cat.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</div>
                </div>
              </div>
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
