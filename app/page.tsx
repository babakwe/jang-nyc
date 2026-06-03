"use client";
import { useState, useMemo, createContext, useContext, useEffect, useRef } from "react";
import certData from "./data/certifications.json";

// ── Language support ──────────────────────────────────────────────────────────
type Lang = "en"|"fr"|"es"|"pt";
const LangCtx = createContext<{lang:Lang;setLang:(l:Lang)=>void}>({lang:"en",setLang:()=>{}});
const useLang = () => useContext(LangCtx);

// Try to load pre-generated translations (run generate_translations.py first)
let TRANS: Record<string, Record<string, Record<string, {q:string;choices:string[];exp:string}>>> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TRANS = require("./data/translations.json");
} catch { /* translations not generated yet — English only */ }

function tQ(catId:string, idx:number, q:{q:string;choices:string[];exp:string}, lang:Lang) {
  if(lang==="en") return q;
  const t = TRANS?.[catId]?.[lang]?.[String(idx)];
  return t ? {...q, ...t} : q;
}

const LANG_META: Record<Lang,{flag:string;name:string}> = {
  en:{flag:"🇺🇸",name:"English"},
  fr:{flag:"🇫🇷",name:"Français"},
  es:{flag:"🇪🇸",name:"Español"},
  pt:{flag:"🇧🇷",name:"Português"},
};

// ── Vocab + interpreter types ─────────────────────────────────────────────────
type VocabCard = { id:string; term:string; definition_en:string; definition_fr:string; example:string; category:string; };
const vocabData = (certData as unknown as {vocab?: Record<string,VocabCard[]>}).vocab || {};
const INTERP_SECTIONS = ["A","B","C","D","E","F","G"];
const INTERP_SECTION_NAMES: Record<string,string> = {
  "A":"Sentence Completion","B":"Paragraph Comprehension","C":"Grammar & Usage",
  "D":"Vocabulary — Synonyms","E":"Vocabulary — Antonyms","F":"Idiomatic Expressions","G":"Legal Terminology"
};

// ── Translated UI strings ─────────────────────────────────────────────────────
const UI: Record<Lang, Record<string,string>> = {
  en: {
    tagline:"Free License & Certification Prep",
    subtitle:"Tap a certification → fee, location, official links · flashcards & chapter quizzes",
    questions:"questions",flashcards:"Flashcards",chapters:"Chapter quizzes",levels:"3 levels",free:"Free",
    allCerts:"NYC Licenses & Certifications",
    examDetails:"Exam details",fee:"💰 Fee",studyTime:"⏱ Study time",difficulty:"📊 Difficulty",
    languages:"🌍 Languages",location:"📍 Where to take it",officialResources:"Official resources",
    officialPage:"Official exam page",studyGuide:"Official study guide",bookExam:"Book your exam",
    practiceWith:"Practice with us — free",startStudying:"📚 Start Studying →",
    allN:"All",cards:"Cards",quiz:"Quiz",difficultyTitle:"Choose difficulty",
    easyL:"Easy",medL:"Medium",hardL:"Hard",
    easyD:"Foundational concepts — start here",
    medD:"Core material — what the exam covers",
    hardD:"Advanced — exam-ready challenge",
    qs15:"15 Qs",tapReveal:"Tap card to reveal · then mark yourself",
    question:"Question — tap to reveal answer",answer:"Answer — tap to go back",
    reviewAgain:"↺ Review again",gotIt:"✓ Got it",deckDone:"Deck complete!",restart:"Restart",back:"← Back",
    niceWork:"Nice work!",keepGoing:"Keep studying!",
    bookExamBtn:"📅 Book your exam →",studyGuideBtn:"📖 Official study guide →",
    tryAnother:"← Try another level",noQuestions:"No questions for this selection.",
    next:"Next →",seeResults:"See Results",why:"Why",correct:"✓ Correct",wrong:"✗ Wrong",
    practiceOnly:"Practice only. Verify current fees and requirements with the official agency before registering.",
    footer:"Free for everyone · no account needed · verify fees with official agencies",
    jangMeans:"Jàng (Wolof: to study) · also available as a mobile app",
  },
  fr: {
    tagline:"Préparation aux licences et certifications — Gratuit",
    subtitle:"Appuyez sur une certification → frais, lieu, liens officiels · cartes mémoire et quiz",
    questions:"questions",flashcards:"Cartes mémoire",chapters:"Quiz par chapitre",levels:"3 niveaux",free:"Gratuit",
    allCerts:"Licences et certifications NYC",
    examDetails:"Détails de l'examen",fee:"💰 Frais",studyTime:"⏱ Durée de préparation",difficulty:"📊 Difficulté",
    languages:"🌍 Langues",location:"📍 Lieu de l'examen",officialResources:"Ressources officielles",
    officialPage:"Page officielle de l'examen",studyGuide:"Guide d'étude officiel",bookExam:"Réserver votre examen",
    practiceWith:"Pratiquez avec nous — gratuit",startStudying:"📚 Commencer à étudier →",
    allN:"Tout",cards:"Cartes",quiz:"Quiz",difficultyTitle:"Choisir la difficulté",
    easyL:"Facile",medL:"Moyen",hardL:"Difficile",
    easyD:"Concepts de base — commencez ici",
    medD:"Matière principale — ce que couvre l'examen",
    hardD:"Avancé — prêt pour l'examen",
    qs15:"15 Qs",tapReveal:"Appuyez sur la carte pour révéler · puis évaluez-vous",
    question:"Question — appuyez pour révéler",answer:"Réponse — appuyez pour revenir",
    reviewAgain:"↺ À revoir",gotIt:"✓ Compris",deckDone:"Jeu terminé !",restart:"Recommencer",back:"← Retour",
    niceWork:"Bien joué !",keepGoing:"Continuez à étudier !",
    bookExamBtn:"📅 Réserver votre examen →",studyGuideBtn:"📖 Guide d'étude officiel →",
    tryAnother:"← Essayer un autre niveau",noQuestions:"Pas de questions pour cette sélection.",
    next:"Suivant →",seeResults:"Voir les résultats",why:"Pourquoi",correct:"✓ Correct",wrong:"✗ Faux",
    practiceOnly:"Entraînement uniquement. Vérifiez les frais et exigences actuels avec l'organisme officiel.",
    footer:"Gratuit pour tous · sans compte · vérifiez les frais avec les organismes officiels",
    jangMeans:"Jàng (en wolof : « étudier ») · aussi disponible sur mobile",
  },
  es: {
    tagline:"Preparación gratuita para licencias y certificaciones",
    subtitle:"Toque una certificación → tarifa, lugar, enlaces oficiales · tarjetas y cuestionarios",
    questions:"preguntas",flashcards:"Tarjetas",chapters:"Quiz por capítulo",levels:"3 niveles",free:"Gratis",
    allCerts:"Licencias y certificaciones de NYC",
    examDetails:"Detalles del examen",fee:"💰 Tarifa",studyTime:"⏱ Tiempo de estudio",difficulty:"📊 Dificultad",
    languages:"🌍 Idiomas",location:"📍 Dónde tomarlo",officialResources:"Recursos oficiales",
    officialPage:"Página oficial del examen",studyGuide:"Guía de estudio oficial",bookExam:"Reservar su examen",
    practiceWith:"Practique con nosotros — gratis",startStudying:"📚 Comenzar a estudiar →",
    allN:"Todo",cards:"Tarjetas",quiz:"Quiz",difficultyTitle:"Elegir dificultad",
    easyL:"Fácil",medL:"Medio",hardL:"Difícil",
    easyD:"Conceptos básicos — empiece aquí",
    medD:"Material principal — lo que cubre el examen",
    hardD:"Avanzado — listo para el examen",
    qs15:"15 Qs",tapReveal:"Toque la tarjeta para ver · luego evalúese",
    question:"Pregunta — toque para revelar",answer:"Respuesta — toque para volver",
    reviewAgain:"↺ Repasar",gotIt:"✓ Entendido",deckDone:"¡Mazo completo!",restart:"Reiniciar",back:"← Atrás",
    niceWork:"¡Buen trabajo!",keepGoing:"¡Siga estudiando!",
    bookExamBtn:"📅 Reservar examen →",studyGuideBtn:"📖 Guía de estudio oficial →",
    tryAnother:"← Probar otro nivel",noQuestions:"No hay preguntas para esta selección.",
    next:"Siguiente →",seeResults:"Ver resultados",why:"Por qué",correct:"✓ Correcto",wrong:"✗ Incorrecto",
    practiceOnly:"Solo práctica. Verifique tarifas y requisitos actuales con el organismo oficial.",
    footer:"Gratis para todos · sin cuenta · verifique tarifas con organismos oficiales",
    jangMeans:"Jàng (en wolof: «estudiar») · también disponible como aplicación móvil",
  },
  pt: {
    tagline:"Preparação gratuita para licenças e certificações",
    subtitle:"Toque em uma certificação → taxa, local, links oficiais · cartões e questionários",
    questions:"perguntas",flashcards:"Cartões",chapters:"Quiz por capítulo",levels:"3 níveis",free:"Grátis",
    allCerts:"Licenças e certificações de NYC",
    examDetails:"Detalhes do exame",fee:"💰 Taxa",studyTime:"⏱ Tempo de estudo",difficulty:"📊 Dificuldade",
    languages:"🌍 Idiomas",location:"📍 Onde fazer o exame",officialResources:"Recursos oficiais",
    officialPage:"Página oficial do exame",studyGuide:"Guia de estudo oficial",bookExam:"Agendar seu exame",
    practiceWith:"Pratique conosco — grátis",startStudying:"📚 Começar a estudar →",
    allN:"Tudo",cards:"Cartões",quiz:"Quiz",difficultyTitle:"Escolher dificuldade",
    easyL:"Fácil",medL:"Médio",hardL:"Difícil",
    easyD:"Conceitos básicos — comece aqui",
    medD:"Material principal — o que o exame aborda",
    hardD:"Avançado — pronto para o exame",
    qs15:"15 Qs",tapReveal:"Toque no cartão para revelar · depois avalie-se",
    question:"Pergunta — toque para revelar",answer:"Resposta — toque para voltar",
    reviewAgain:"↺ Revisar",gotIt:"✓ Entendido",deckDone:"Baralho completo!",restart:"Reiniciar",back:"← Voltar",
    niceWork:"Bom trabalho!",keepGoing:"Continue estudando!",
    bookExamBtn:"📅 Agendar exame →",studyGuideBtn:"📖 Guia de estudo oficial →",
    tryAnother:"← Tentar outro nível",noQuestions:"Sem perguntas para esta seleção.",
    next:"Próximo →",seeResults:"Ver resultados",why:"Por que",correct:"✓ Correto",wrong:"✗ Errado",
    practiceOnly:"Apenas prática. Verifique as taxas e requisitos atuais com o órgão oficial.",
    footer:"Grátis para todos · sem conta · verifique taxas com órgãos oficiais",
    jangMeans:"Jàng (em wólof: «estudar») · também disponível como aplicativo",
  },
};

type Q = { id:string; q:string; choices:string[]; answer:number; exp:string; };
type Cat = typeof certData.categories[0];
type Diff = "easy"|"medium"|"hard";
type Mode = "flash"|"quiz";

const ALL = certData.questions as unknown as Record<string,Q[]>;

const META: Record<string,{fee:string;feeNote:string;where:string;officialUrl:string;studyUrl:string;bookUrl:string;timeToStudy:string;difficulty:string;languages:string;}> = {
  fdny:{
    fee:"$25 – $45",feeNote:"F-01: $25 · F-03: $35 · G-60: $45",
    where:"FDNY HQ — 9 MetroTech Center, Brooklyn (walk-in Mon–Fri 8am–3pm)",
    officialUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    studyUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",
    bookUrl:"https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    timeToStudy:"1–2 weeks",difficulty:"Medium",languages:"English only"},
  cna:{
    fee:"$180 – $220",feeNote:"Pearson VUE fee. Many programs cover the cost.",
    where:"Pearson VUE test centers across NYC",
    officialUrl:"https://www.pearsonvue.com/us/en/nclex.html",
    studyUrl:"https://www.ncsbn.org/nclex",
    bookUrl:"https://www.pearsonvue.com/us/en/nclex/register.html",
    timeToStudy:"4–8 weeks",difficulty:"Medium–High",languages:"English, Spanish (select centers)"},
  hha:{
    fee:"$0 – $50",feeNote:"Often covered by your 75-hr training program.",
    where:"Through your HHA training program provider",
    officialUrl:"https://www.health.ny.gov/facilities/home_care/aide_training.htm",
    studyUrl:"https://www.health.ny.gov/facilities/home_care/",
    bookUrl:"https://www.health.ny.gov/facilities/home_care/",
    timeToStudy:"2–4 weeks",difficulty:"Easy–Medium",languages:"Multiple languages available"},
  teas:{
    fee:"$115",feeNote:"ATI TEAS. Check if your school covers retakes.",
    where:"Your nursing school or ATI testing center",
    officialUrl:"https://www.atitesting.com/teas",
    studyUrl:"https://www.atitesting.com/teas/study",
    bookUrl:"https://www.atitesting.com/teas/register",
    timeToStudy:"4–12 weeks",difficulty:"High",languages:"English only"},
  interpreter:{
    fee:"$200",feeNote:"NYS Unified Court System exam fee. Oral + written components.",
    where:"111 Centre Street, Manhattan — Room 1189 (by appointment)",
    officialUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",
    studyUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",
    bookUrl:"https://www.nycourts.gov/careers/exams/exam-study-guides-resources",
    timeToStudy:"3–6 months",difficulty:"Very High",languages:"70+ languages offered"},
  dmv:{
    fee:"$80",feeNote:"Includes learner permit + first road test.",
    where:"Any NYC DMV office (appointments recommended)",
    officialUrl:"https://dmv.ny.gov/learners-permit",
    studyUrl:"https://dmv.ny.gov/driver-license/get-driver-license-0",
    bookUrl:"https://dmv.ny.gov/office-visit/find-dmv-office-or-kiosk",
    timeToStudy:"1–2 weeks",difficulty:"Easy",
    languages:"English, Spanish, Chinese, Russian, Korean, Arabic, Haitian Creole + 20 more"},
  security:{
    fee:"$36 – $108",feeNote:"Unarmed: $36.25 · Armed: $108 (NYS Dept. of State)",
    where:"Pearson VUE test centers or online proctored",
    officialUrl:"https://www.dos.ny.gov/licensing/security_guard/index.html",
    studyUrl:"https://www.dos.ny.gov/licensing/security_guard/study.html",
    bookUrl:"https://www.pearsonvue.com/us/en/dos-nys.html",
    timeToStudy:"1–3 weeks",difficulty:"Easy–Medium",languages:"English only"},
};

const CHAPTERS: Record<string,string[]> = {
  fdny:["Fire Guard Basics","Fire Watch Duties","Emergency Procedures","Fire Prevention","Building Systems"],
  cna:["Infection Control","Safety & Emergency","Basic Nursing Care","Mental Health","Patient Rights"],
  hha:["Personal Care","Safety & Environment","Communication","Patient Rights","Nutrition"],
  teas:["Reading Comprehension","Math & Data","Science","English Language"],
  interpreter:["Legal Terminology","Court Procedures","Ethics & Conduct","Vocabulary in Context"],
  dmv:["Traffic Laws","Road Signs & Signals","Right of Way","Driving Skills","Alcohol & Drugs"],
  security:["Legal Authority","Use of Force","Emergency Response","Report Writing"],
};

function chOf(id:string,i:number,total:number){
  const chs=CHAPTERS[id]||["General"];
  return chs[Math.min(Math.floor((i/total)*chs.length),chs.length-1)];
}

// ── Flashcard deck ─────────────────────────────────────────────────────────
function Flashcards({cat,ch,onBack}:{cat:Cat&{color:string;bg:string};ch:string|null;onBack:()=>void}){
  const {lang}=useLang();
  const t=(k:string)=>UI[lang]?.[k]||UI.en[k]||k;
  const qs=ALL[cat.id]||[];
  const cards=useMemo(()=>{
    const all=qs.map((q,i)=>{
      const tq=tQ(cat.id,i,q,lang);
      return {
        front:tq.q,
        back:(tq.choices[q.answer]||"")+"\n\n"+(tq.exp||""),
        ch:chOf(cat.id,i,qs.length)
      };
    });
    return ch?all.filter(c=>c.ch===ch):all;
  },[cat.id,ch,qs,lang]);
  const [idx,setIdx]=useState(0);
  const [flip,setFlip]=useState(false);
  const [got,setGot]=useState(0);
  const [rev,setRev]=useState(0);
  function mark(k:boolean){
    k?setGot(n=>n+1):setRev(n=>n+1);
    setFlip(false);
    setIdx(i=>i+1>=cards.length?-1:i+1);
  }
  if(idx===-1)return(
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-xl font-black mb-2" style={{color:cat.color}}>{t("deckDone")}</h2>
        <p className="text-gray-500 mb-6">{got} {t("gotIt").replace("✓ ","")} · {rev} {t("reviewAgain").replace("↺ ","")}</p>
        <div className="flex gap-3">
          <button onClick={()=>{setIdx(0);setFlip(false);setGot(0);setRev(0);}} className="flex-1 py-3 rounded-xl font-bold text-white" style={{backgroundColor:cat.color}}>{t("restart")}</button>
          <button onClick={onBack} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600">{t("back")}</button>
        </div>
      </div>
    </div>
  );
  const card=cards[idx];
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">📇 Flashcards{ch?` · ${ch}`:""}</div>
          <div className="text-white/70 text-xs">{idx+1}/{cards.length} · {got}✓ {rev}↺</div>
        </div>
      </div>
      <div className="h-1" style={{backgroundColor:cat.bg}}>
        <div className="h-full transition-all" style={{width:`${(idx/cards.length)*100}%`,backgroundColor:cat.color}}/>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6">
        <button onClick={()=>setFlip(f=>!f)}
          className="w-full min-h-52 bg-white rounded-2xl shadow p-6 text-left active:scale-[0.99] transition-all relative mb-4">
          <span className="text-xs font-bold uppercase tracking-wide block mb-3" style={{color:cat.color}}>
            {flip?t("answer"):t("question")}
          </span>
          <p className="text-gray-900 font-semibold leading-relaxed text-base whitespace-pre-line">{flip?card.back:card.front}</p>
          {!flip&&<div className="absolute bottom-4 right-4 text-gray-300 text-2xl">↺</div>}
        </button>
        {flip?(
          <div className="flex gap-3">
            <button onClick={()=>mark(false)} className="flex-1 py-4 rounded-xl font-bold bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100">{t("reviewAgain")}</button>
            <button onClick={()=>mark(true)} className="flex-1 py-4 rounded-xl font-bold bg-green-50 border-2 border-green-200 text-green-700 hover:bg-green-100">{t("gotIt")}</button>
          </div>
        ):(
          <p className="text-center text-sm text-gray-400">Tap card to reveal · then mark yourself</p>
        )}
      </div>
    </div>
  );
}

// ── Quiz session ─────────────────────────────────────────────────────────────
function Quiz({cat,diff,ch,onBack}:{cat:Cat&{color:string;bg:string};diff:Diff;ch:string|null;onBack:()=>void}){
  const {lang}=useLang();
  const t=(k:string)=>UI[lang]?.[k]||UI.en[k]||k;
  const allQs=ALL[cat.id]||[];
  const qs=useMemo(()=>{
    let pool=allQs.map((q,i)=>({...q,_ch:chOf(cat.id,i,allQs.length)}));
    if(ch)pool=pool.filter(q=>q._ch===ch);
    if(diff==="easy")  pool=pool.slice(0,Math.ceil(pool.length*0.45));
    if(diff==="medium")pool=pool.slice(Math.floor(pool.length*0.2),Math.floor(pool.length*0.8));
    if(diff==="hard")  pool=pool.slice(Math.floor(pool.length*0.5));
    return pool.slice(0,15);
  },[allQs,cat.id,diff,ch]);
  const [idx,setIdx]=useState(0);
  const [picked,setPicked]=useState<number|null>(null);
  const [score,setScore]=useState(0);
  const [done,setDone]=useState(false);
  const meta=META[cat.id];
  const _q=qs[idx];
  const q:{q:string;choices:string[];exp:string;answer:number}|undefined = _q ? {..._q,...tQ(cat.id,idx,_q,lang)} : undefined;
  const ok=picked===_q?.answer;
  function choose(i:number){if(picked!==null||!_q)return;setPicked(i);if(i===_q.answer)setScore(s=>s+1);}
  function next(){if(idx+1>=qs.length){setDone(true);return;}setIdx(i=>i+1);setPicked(null);}
  if(!qs.length)return(
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center"><p className="text-gray-500 mb-4">No questions for this selection.</p>
      <button onClick={onBack} className="text-blue-600 font-bold">← Back</button></div>
    </div>
  );
  if(done){
    const pct=Math.round((score/qs.length)*100);
    const pass=pct>=70;
    return(
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-5xl mb-3">{pass?"🎉":"📚"}</div>
          <h2 className="text-2xl font-black mb-1" style={{color:cat.color}}>{pass?t("niceWork"):t("keepGoing")}</h2>
          <p className="text-gray-500 mb-4">{score}/{qs.length} correct · {pct}%</p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:pass?"#16a34a":"#f59e0b"}}/>
          </div>
          <a href={pass?meta.bookUrl:meta.studyUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-white font-bold text-center mb-3 hover:opacity-90" style={{backgroundColor:cat.color}}>
            {pass?t("bookExamBtn"):t("studyGuideBtn")}
          </a>
          <button onClick={onBack} className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-600">{t("tryAnother")}</button>
        </div>
      </div>
    );
  }
  const diffLabel={easy:"🟢",medium:"🟡",hard:"🔴"}[diff]+" "+{easy:t("easyL"),medium:t("medL"),hard:t("hardL")}[diff];
  if(!q)return null;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm truncate">{ch||cat.title}</div>
          <div className="text-white/70 text-xs">{diffLabel} · Q {idx+1}/{qs.length}</div>
        </div>
        <div className="text-white font-bold">{score}/{idx+(picked!==null?1:0)}</div>
      </div>
      <div className="h-1" style={{backgroundColor:cat.bg}}>
        <div className="h-full transition-all" style={{width:`${((idx+(picked!==null?1:0))/qs.length)*100}%`,backgroundColor:cat.color}}/>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <p className="font-semibold text-gray-900 leading-relaxed">{q.q}</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((ch2,i)=>{
            const sel=picked===i,corr=i===q.answer;
            let cls="bg-white border-gray-200 text-gray-800";
            if(picked!==null){if(corr)cls="bg-green-50 border-green-400 text-green-800";else if(sel)cls="bg-red-50 border-red-400 text-red-800";}
            return(
              <button key={i} onClick={()=>choose(i)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls} ${picked===null?"hover:border-blue-200 hover:bg-blue-50/30":""}`}>
                <span className="font-bold mr-2">{["A","B","C","D"][i]}.</span>{ch2}
                {picked!==null&&corr&&<span className="ml-2">✓</span>}
                {picked!==null&&sel&&!corr&&<span className="ml-2">✗</span>}
              </button>
            );
          })}
        </div>
        {picked!==null&&q.exp&&(
          <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-400 mb-4">
            <p className="text-xs font-bold text-amber-700 mb-1">{ok?t("correct"):t("wrong")} — {t("why")}</p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
          </div>
        )}
        {picked!==null&&(
          <button onClick={next} className="w-full py-4 rounded-xl font-black text-white hover:opacity-90" style={{backgroundColor:cat.color}}>
            {idx+1<qs.length?t("next"):t("seeResults")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Study hub: chapters + mode + difficulty ───────────────────────────────
function StudyHub({cat,onBack}:{cat:Cat&{color:string;bg:string};onBack:()=>void}){
  const {lang}=useLang();
  const t=(k:string)=>UI[lang]?.[k]||UI.en[k]||k;
  const [ch,setCh]=useState<string|null>(null);
  const [mode,setMode]=useState<Mode|null>(null);
  const [diff,setDiff]=useState<Diff|null>(null);
  const qs=ALL[cat.id]||[];
  const chs=CHAPTERS[cat.id]||[];
  const perCh=Math.ceil(qs.length/Math.max(chs.length,1));

  if(mode==="flash")return <Flashcards cat={cat} ch={ch} onBack={()=>{setMode(null);setDiff(null);}}/>;
  if(mode==="quiz"&&diff)return <Quiz cat={cat} diff={diff} ch={ch} onBack={()=>{setMode(null);setDiff(null);}}/>;

  if(mode==="quiz"&&!diff)return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={()=>setMode(null)} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold truncate">{ch||"All chapters"} · Difficulty</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">15 questions · choose your level</p>
        {([["easy","🟢","easyL","easyD"],
           ["medium","🟡","medL","medD"],
           ["hard","🔴","hardL","hardD"]] as const).map(([d,emoji,lk,dk])=>(
          <button key={d} onClick={()=>setDiff(d as Diff)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 flex items-center gap-4 active:scale-[0.99] transition-all">
            <span className="text-3xl">{emoji}</span>
            <div className="flex-1"><div className="font-bold text-gray-900">{t(lk)}</div><div className="text-sm text-gray-500 mt-0.5">{t(dk)}</div></div>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{backgroundColor:cat.bg,color:cat.color}}>15 Qs</span>
          </button>
        ))}
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:cat.color}}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold">{cat.emoji} {cat.id==="interpreter"?"Court Interpreter":META[cat.id]?`${cat.title}`:cat.title}</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        {/* Full deck */}
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1 mb-3">All {qs.length} questions</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={()=>{setCh(null);setMode("flash");}}
            className="bg-white rounded-2xl p-4 shadow-sm border-l-4 text-center hover:shadow-md active:scale-[0.99] transition-all"
            style={{borderLeftColor:cat.color}}>
            <div className="text-3xl mb-1">📇</div>
            <div className="font-bold text-gray-900 text-sm">Flashcards</div>
            <div className="text-xs text-gray-400 mt-1">Flip to study · mark progress</div>
          </button>
          <button onClick={()=>{setCh(null);setMode("quiz");}}
            className="bg-white rounded-2xl p-4 shadow-sm border-l-4 text-center hover:shadow-md active:scale-[0.99] transition-all"
            style={{borderLeftColor:cat.color}}>
            <div className="text-3xl mb-1">📝</div>
            <div className="font-bold text-gray-900 text-sm">Practice Quiz</div>
            <div className="text-xs text-gray-400 mt-1">15 Qs · 3 difficulty levels</div>
          </button>
        </div>
        {/* By chapter */}
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1 mb-3">By chapter</p>
        <div className="flex flex-col gap-2">
          {chs.map((chapter,i)=>(
            <div key={chapter} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{borderLeftWidth:3,borderLeftColor:cat.color}}>
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{backgroundColor:cat.color}}>{i+1}</span>
                <div className="flex-1 font-semibold text-gray-800 text-sm">{chapter}</div>
                <span className="text-xs text-gray-400 shrink-0">~{perCh} Qs</span>
              </div>
              <div className="flex border-t border-gray-50">
                <button onClick={()=>{setCh(chapter);setMode("flash");}}
                  className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color:cat.color}}>
                  📇 Cards
                </button>
                <div className="w-px bg-gray-100"/>
                <button onClick={()=>{setCh(chapter);setMode("quiz");}}
                  className="flex-1 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors" style={{color:cat.color}}>
                  📝 Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Vocabulary flashcards (interpreter) ──────────────────────────────────────
function VocabDeck({catId,filter,onBack}:{catId:string;filter:string|null;onBack:()=>void}){
  const {lang}=useLang();
  const cards=(vocabData[catId]||[]).filter(c=>!filter||c.category===filter);
  const [idx,setIdx]=useState(0);
  const [flip,setFlip]=useState(false);
  const [got,setGot]=useState(0);
  const [rev,setRev]=useState(0);
  const color="#E65100";
  if(!cards.length)return(
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center"><p className="text-gray-500 mb-4">No vocabulary cards for this selection.</p>
      <button onClick={onBack} className="text-orange-600 font-bold">← Back</button></div>
    </div>
  );
  if(idx>=cards.length)return(
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-xl font-black mb-2" style={{color}}>Vocab deck complete!</h2>
        <p className="text-gray-500 mb-6">{got} ✓ know it · {rev} ↺ review</p>
        <div className="flex gap-3">
          <button onClick={()=>{setIdx(0);setFlip(false);setGot(0);setRev(0);}} className="flex-1 py-3 rounded-xl font-bold text-white" style={{backgroundColor:color}}>Restart</button>
          <button onClick={onBack} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600">← Back</button>
        </div>
      </div>
    </div>
  );
  const card=cards[idx];
  function mark(k:boolean){k?setGot(n=>n+1):setRev(n=>n+1);setFlip(false);setIdx(i=>i+1);}
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">📇 Vocabulary · {filter||"All"}</div>
          <div className="text-white/70 text-xs">{idx+1}/{cards.length} · {got}✓ {rev}↺</div>
        </div>
        <span className="text-white/70 text-xs">{lang==="fr"?"FR":"EN"}</span>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6">
        <button onClick={()=>setFlip(f=>!f)}
          className="w-full min-h-56 bg-white rounded-2xl shadow p-6 text-left active:scale-[0.99] transition-all relative mb-4">
          {!flip?(
            <>
              <span className="text-xs font-bold uppercase tracking-wide text-orange-400 block mb-2">English term — tap to see meaning</span>
              <p className="text-2xl font-black text-gray-900 mb-3">{card.term}</p>
              <p className="text-xs text-gray-400 italic">"{card.example}"</p>
              <div className="absolute bottom-4 right-4 text-gray-300 text-2xl">↺</div>
            </>
          ):(
            <>
              <span className="text-xs font-bold uppercase tracking-wide text-green-600 block mb-2">
                {lang==="fr"?"Français":"English meaning"}
              </span>
              <p className="text-lg font-bold text-gray-900 mb-3">
                {lang==="fr"?card.definition_fr:card.definition_en}
              </p>
              {lang==="fr"&&<p className="text-sm text-gray-500 mb-2">EN: {card.definition_en}</p>}
              <p className="text-xs text-orange-500 italic">"{card.example}"</p>
              <span className="inline-block mt-3 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">{card.category}</span>
            </>
          )}
        </button>
        {flip?(
          <div className="flex gap-3">
            <button onClick={()=>mark(false)} className="flex-1 py-4 rounded-xl font-bold bg-red-50 border-2 border-red-200 text-red-600">↺ Review again</button>
            <button onClick={()=>mark(true)}  className="flex-1 py-4 rounded-xl font-bold bg-green-50 border-2 border-green-200 text-green-700">✓ I know it</button>
          </div>
        ):(
          <p className="text-center text-sm text-gray-400">Tap the card to see the {lang==="fr"?"French meaning":"definition"}</p>
        )}
      </div>
    </div>
  );
}

// ── Official test mode (63 questions, 90 min, pass at 70%) ────────────────────
function OfficialTest({cat,onBack}:{cat:Cat&{color:string;bg:string};onBack:()=>void}){
  const allQs=(ALL[cat.id]||[]).slice(0,63); // official 63 only
  const [idx,setIdx]=useState(0);
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [done,setDone]=useState(false);
  const [secs,setSecs]=useState(90*60); // 90 minutes
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{
    if(done)return;
    timerRef.current=setInterval(()=>setSecs(s=>{if(s<=1){setDone(true);return 0;}return s-1;}),1000);
    return ()=>{if(timerRef.current)clearInterval(timerRef.current);};
  },[done]);

  const color="#E65100";
  const q=allQs[idx];
  const picked=answers[idx]??null;

  function choose(i:number){
    if(picked!==null||!q)return;
    setAnswers(a=>({...a,[idx]:i}));
  }
  function goNext(){if(idx+1>=allQs.length){setDone(true);}else{setIdx(i=>i+1);}}
  function skip(){if(idx+1<allQs.length)setIdx(i=>i+1);}

  const formatTime=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const timeColor=secs<600?"#C62828":secs<1800?"#F9A825":undefined;

  if(done){
    const score=allQs.filter((_,i)=>answers[i]===allQs[i]?.answer).length;
    const pct=Math.round((score/allQs.length)*100);
    const pass=pct>=70;
    // Section breakdown
    const sections: Record<string,{total:number;correct:number}> = {};
    allQs.forEach((q2,i)=>{
      const sec=(q2 as {section?:string}).section||"?";
      if(!sections[sec])sections[sec]={total:0,correct:0};
      sections[sec].total++;
      if(answers[i]===q2.answer)sections[sec].correct++;
    });
    return(
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 px-4 py-3" style={{backgroundColor:color}}>
          <p className="text-white font-bold">Official Test — Results</p>
        </div>
        <div className="max-w-lg mx-auto p-4 pt-5">
          <div className="bg-white rounded-2xl shadow p-6 mb-4 text-center">
            <div className="text-5xl mb-3">{pass?"🎉":"📚"}</div>
            <h2 className="text-2xl font-black mb-1" style={{color:pass?"#16a34a":"#C62828"}}>
              {pass?"PASSED":"NOT PASSED"}
            </h2>
            <p className="text-3xl font-black mb-1">{pct}%</p>
            <p className="text-gray-500 mb-4">{score} / {allQs.length} correct · passing score: 70% (53+/75 on real test)</p>
            <div className="h-4 bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:pass?"#16a34a":"#C62828"}}/>
            </div>
            <p className="text-xs text-gray-400">70% = passing threshold on the real NYS exam</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Score by section</h3>
            {Object.entries(sections).sort(([a],[b])=>a.localeCompare(b)).map(([sec,{total,correct}])=>{
              const spct=Math.round((correct/total)*100);
              return(
                <div key={sec} className="flex items-center gap-3 mb-2">
                  <span className="w-6 font-black text-orange-500 text-sm">{sec}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-gray-700">{INTERP_SECTION_NAMES[sec]||sec}</span>
                      <span className={spct>=70?"text-green-600 font-bold":"text-red-500 font-bold"}>{correct}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${spct}%`,backgroundColor:spct>=70?"#16a34a":"#C62828"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!pass&&(
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-amber-800 mb-1">Study focus: sections below 70%</p>
              <p className="text-xs text-amber-700">Go back and drill those sections with flashcards + quizzes before retaking.</p>
            </div>
          )}
          <div className="flex gap-3 mb-4">
            {pass&&<a href="https://www.nycourts.gov/careers/exams/exam-study-guides-resources"
              target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl text-white font-bold text-center" style={{backgroundColor:color}}>
              📅 Register for the exam →
            </a>}
            <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600">← Study more</button>
          </div>
        </div>
      </div>
    );
  }

  if(!q)return null;
  const answered=Object.keys(answers).length;

  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-2 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={onBack} className="text-white/70 hover:text-white font-bold text-lg">←</button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">Official Test · Section {(q as {section?:string}).section||"?"}</div>
          <div className="text-white/70 text-xs">Q {idx+1}/{allQs.length} · {answered} answered</div>
        </div>
        <div className="text-right">
          <div className="font-black text-sm" style={{color:timeColor||"white"}}>{formatTime(secs)}</div>
          <div className="text-white/50 text-xs">remaining</div>
        </div>
      </div>
      <div className="h-1" style={{backgroundColor:"#FFF3E0"}}>
        <div className="h-full transition-all" style={{width:`${(answered/allQs.length)*100}%`,backgroundColor:color}}/>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        {(q as unknown as {passage?:string}).passage&&(
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-1">READ — then answer the question below</p>
            <p className="text-sm text-blue-900 leading-relaxed">{(q as unknown as {passage:string}).passage}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <p className="font-semibold text-gray-900 leading-relaxed">{q.q}</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((ch,i)=>{
            const sel=picked===i,corr=i===q.answer,answered2=picked!==null;
            let cls="bg-white border-gray-200 text-gray-800";
            if(answered2){if(corr)cls="bg-green-50 border-green-400 text-green-800";else if(sel)cls="bg-red-50 border-red-400 text-red-800";}
            return(
              <button key={i} onClick={()=>choose(i)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls} ${picked===null?"hover:border-orange-200 hover:bg-orange-50/20":""}`}>
                <span className="font-bold mr-2">{["A","B","C","D"][i]}.</span>{ch}
                {answered2&&corr&&<span className="ml-2">✓</span>}
                {answered2&&sel&&!corr&&<span className="ml-2">✗</span>}
              </button>
            );
          })}
        </div>
        {picked!==null&&q.exp&&(
          <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-400 mb-4">
            <p className="text-xs font-bold text-amber-700 mb-1">{picked===q.answer?"✓ Correct":"✗ Wrong"} — Explanation</p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
          </div>
        )}
        <div className="flex gap-3">
          {picked!==null&&<button onClick={goNext} className="flex-1 py-4 rounded-xl font-black text-white hover:opacity-90" style={{backgroundColor:color}}>
            {idx+1<allQs.length?"Next →":"See Results"}
          </button>}
          {picked===null&&idx+1<allQs.length&&(
            <button onClick={skip} className="w-full py-4 rounded-xl font-bold border-2 border-orange-200 text-orange-600">Skip for now →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Interpreter hub (replaces StudyHub for interpreter) ───────────────────────
function InterpreterHub({cat,onBack}:{cat:Cat&{color:string;bg:string};onBack:()=>void}){
  const {lang}=useLang();
  type IScreen = "menu"|"vocab"|"vocab_deck"|"sectionList"|"quiz_diff"|"quiz"|"official";
  const [screen,setScreen]=useState<IScreen>("menu");
  const [vocabFilter,setVocabFilter]=useState<string|null>(null);
  const [section,setSection]=useState<string|null>(null);
  const [diff,setDiff]=useState<"easy"|"medium"|"hard">("medium");
  const color=cat.color;
  const vocabCards=vocabData[cat.id]||[];

  if(screen==="vocab_deck")return<VocabDeck catId={cat.id} filter={vocabFilter} onBack={()=>setScreen("vocab")}/>;
  if(screen==="quiz"){
    return<Quiz cat={cat} diff={diff} ch={section?INTERP_SECTION_NAMES[section]||section:null} onBack={()=>setScreen("quiz_diff")}/>;
  }
  if(screen==="official")return<OfficialTest cat={cat} onBack={()=>setScreen("menu")}/>;

  if(screen==="vocab")return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>setScreen("menu")} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold">📇 Vocabulary Flashcards</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        <p className="text-xs text-gray-400 mb-3 px-1">Study the vocabulary words from the exam. Tap a set to start.</p>
        <button onClick={()=>{setVocabFilter(null);setScreen("vocab_deck");}}
          className="w-full text-left bg-white rounded-2xl shadow-sm p-4 mb-3 border-l-4 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color}}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">All vocabulary words</div>
              <div className="text-xs text-gray-500 mt-0.5">{vocabCards.length} terms · English + {lang==="fr"?"Français":"French"}</div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color}}>{vocabCards.length}</span>
          </div>
        </button>
        {[["vocabulary","📖 General Vocabulary","Words in Sections A–E"],
          ["idiom","🗣 Idiomatic Expressions","Idioms from Section F"],
          ["legal","⚖️ Legal Terminology","Terms from Section G"]].map(([cat2,label,desc])=>{
          const n=vocabCards.filter(c=>c.category===cat2).length;
          return(
            <button key={cat2} onClick={()=>{setVocabFilter(cat2);setScreen("vocab_deck");}}
              className="w-full text-left bg-white rounded-2xl shadow-sm p-4 mb-2 border-l-4 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color}}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color}}>{n}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  if(screen==="sectionList")return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>setScreen("menu")} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold">Practice by Section</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        <p className="text-xs text-gray-400 mb-3 px-1">The real exam has 7 sections. Drill each one separately.</p>
        {INTERP_SECTIONS.map(sec=>{
          const qs=ALL[cat.id]||[];
          const n=qs.filter(q=>(q as {section?:string}).section===sec).length;
          if(!n)return null;
          return(
            <button key={sec} onClick={()=>{setSection(sec);setScreen("quiz_diff");}}
              className="w-full text-left bg-white rounded-2xl shadow-sm p-4 mb-2 border-l-4 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color}}>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0" style={{backgroundColor:color}}>{sec}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">{INTERP_SECTION_NAMES[sec]}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{n} questions</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  if(screen==="quiz_diff")return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={()=>{if(section)setSection(null);setScreen("sectionList");}} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold truncate">{section?INTERP_SECTION_NAMES[section]:"All sections"} · Difficulty</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6 flex flex-col gap-3">
        {([["easy","🟢","Easy — Learn the basics",    "Foundational questions · new to this topic"],
           ["medium","🟡","Medium — Core prep",         "Questions that appear most on the exam"],
           ["hard","🔴","Hard — Exam ready",          "Toughest questions · Section C, B, and G"]] as const).map(([d,e,l,desc])=>(
          <button key={d} onClick={()=>{setDiff(d);setScreen("quiz");}}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-orange-200 flex items-center gap-4 active:scale-[0.99] transition-all">
            <span className="text-3xl">{e}</span>
            <div className="flex-1"><div className="font-bold text-gray-900">{l}</div><div className="text-sm text-gray-500">{desc}</div></div>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{backgroundColor:cat.bg,color}}>15 Qs</span>
          </button>
        ))}
      </div>
    </div>
  );

  const qs=ALL[cat.id]||[];
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{backgroundColor:color}}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold text-lg">←</button>
        <div className="text-white font-bold">⚖️ Court Interpreter</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-bold text-orange-800 mb-1">📝 About the real exam</p>
          <p className="text-xs text-orange-700 leading-relaxed">
            75 multiple-choice questions · 90 minutes · 7 sections (A–G) · passing score: 70%
            (approx. 53 correct). Written in English. Available in 70+ target languages.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={()=>setScreen("official")}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 border-2 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color,borderColor:color}}>
            <div className="flex items-center gap-4">
              <span className="text-3xl">🏛</span>
              <div className="flex-1">
                <div className="font-black text-gray-900">Official Practice Test</div>
                <div className="text-xs text-gray-500 mt-1">63 official questions · timed · pass/fail grading · section breakdown</div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{backgroundColor:color}}>63 Qs</span>
            </div>
          </button>
          <button onClick={()=>setScreen("vocab")}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color}}>
            <div className="flex items-center gap-4">
              <span className="text-3xl">📇</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Vocabulary Flashcards</div>
                <div className="text-xs text-gray-500 mt-1">{vocabCards.length} terms · English + French · vocab, idioms, legal</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:cat.bg,color}}>{vocabCards.length}</span>
            </div>
          </button>
          <button onClick={()=>setScreen("sectionList")}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md active:scale-[0.99] transition-all" style={{borderLeftColor:color}}>
            <div className="flex items-center gap-4">
              <span className="text-3xl">📚</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Practice by Section</div>
                <div className="text-xs text-gray-500 mt-1">A – G · drill each section separately · 15 questions · Easy/Medium/Hard</div>
              </div>
              <div className="flex gap-1">
                {INTERP_SECTIONS.map(s=>(
                  <span key={s} className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center text-white" style={{backgroundColor:color,fontSize:"9px"}}>{s}</span>
                ))}
              </div>
            </div>
          </button>
          <a href="https://www.surveygizmo.com/s3/4612658/Per-Diem-Court-Interpreter-Sample-Test"
            target="_blank" rel="noopener noreferrer"
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-4 hover:shadow-md transition-all flex items-center gap-4" style={{borderLeftColor:"#888"}}>
            <span className="text-3xl">🔗</span>
            <div className="flex-1">
              <div className="font-bold text-gray-700">Official NYS Sample Test</div>
              <div className="text-xs text-gray-400 mt-1">surveygizmo.com · 75 questions · official source</div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Exam hub ──────────────────────────────────────────────────────────────
function ExamHub({cat,onStudy,onBack}:{cat:Cat;onStudy:()=>void;onBack:()=>void}){
  const {lang}=useLang();
  const t=(k:string)=>UI[lang]?.[k]||UI.en[k]||k;
  const meta=META[cat.id];
  if(!meta)return null;
  const count=(ALL[cat.id]||[]).length;
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-10 pb-6" style={{background:`linear-gradient(135deg, ${cat.color} 0%, ${cat.color}cc 100%)`}}>
        <button onClick={onBack} className="text-white/70 hover:text-white text-sm mb-4 block">← All Certifications</button>
        <div className="text-4xl mb-2">{cat.emoji}</div>
        <h1 className="text-2xl font-black text-white mb-1">{cat.title}</h1>
        <p className="text-white/80 text-sm leading-relaxed">{cat.description}</p>
      </div>
      <div className="max-w-lg mx-auto p-4 -mt-2">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Exam details</h3>
          <div className="grid grid-cols-2 gap-4">
            {([["💰 Fee",meta.fee],["⏱ Study time",meta.timeToStudy],["📊 Difficulty",meta.difficulty],["🌍 Languages",meta.languages]] as const).map(([l,v])=>(
              <div key={l}><div className="text-xs text-gray-400 mb-0.5">{l}</div><div className="text-sm font-semibold text-gray-800">{v}</div></div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-0.5">📍 Where to take it</div>
            <div className="text-sm font-semibold text-gray-800">{meta.where}</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{meta.feeNote}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{t("officialResources")}</h3>
          {[
            {icon:"🏛",label:t("officialPage"),url:meta.officialUrl},
            {icon:"📖",label:t("studyGuide"),url:meta.studyUrl},
            {icon:"📅",label:t("bookExam"),url:meta.bookUrl},
            ...(cat.id==="interpreter"?[{icon:"📝",label:"Official Sample Test (75 Qs, 90 min)",url:"https://www.surveygizmo.com/s3/4612658/Per-Diem-Court-Interpreter-Sample-Test"}]:[]),
          ].map(({icon,label,url})=>(
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 -mx-1 group">
              <span className="text-lg">{icon}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-400 truncate">{url.replace("https://","").split("/")[0]}</div>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500">→</span>
            </a>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{t("practiceWith")}</h3>
          <p className="text-xs text-gray-500 mb-4">{count} {t("questions")} · {t("flashcards")} · {t("chapters")} · {t("levels")}</p>
          <button onClick={onStudy} className="w-full py-4 rounded-xl font-black text-white text-base hover:opacity-90" style={{backgroundColor:cat.color}}>
            {t("startStudying")}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center px-4 pb-6 leading-relaxed">{t("practiceOnly")}</p>
      </div>
    </div>
  );
}

// ── Language selector bar ────────────────────────────────────────────────────
function LangBar(){
  const {lang,setLang}=useLang();
  return(
    <div className="flex gap-1 justify-end px-4 py-2 bg-white border-b border-gray-100">
      {(Object.entries(LANG_META) as [Lang,{flag:string;name:string}][]).map(([code,m])=>(
        <button key={code} onClick={()=>setLang(code)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${lang===code?"text-white shadow":"text-gray-500 hover:bg-gray-100"}`}
          style={lang===code?{backgroundColor:"#003087"}:{}}>
          {m.flag} {m.name}
        </button>
      ))}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────
function HomeScreen(){
  type S="home"|"hub"|"study"|"interpreter";
  const {lang}=useLang();
  const t=(k:string)=>UI[lang]?.[k]||UI.en[k]||k;
  const [screen,setScreen]=useState<S>("home");
  const [active,setActive]=useState<Cat|null>(null);
  function openHub(cat:Cat){
    setActive(cat);
    setScreen(cat.id==="interpreter"?"interpreter":"hub");
  }
  const fullCat=active?{...active,...(META[active.id]||{})}:null;
  if(screen==="hub"&&active)return <ExamHub cat={active} onStudy={()=>setScreen("study")} onBack={()=>setScreen("home")}/>;
  if(screen==="study"&&fullCat)return <StudyHub cat={fullCat as Cat&{color:string;bg:string}} onBack={()=>setScreen("hub")}/>;
  if(screen==="interpreter"&&fullCat)return <InterpreterHub cat={fullCat as Cat&{color:string;bg:string}} onBack={()=>setScreen("home")}/>;
  const total=certData.categories.reduce((s,c)=>s+c.count,0);
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-10 pb-8" style={{background:"linear-gradient(135deg, #003087 0%, #0052A5 100%)"}}>
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-3xl font-black text-white mb-1">Jàng NYC</h1>
          <p className="text-blue-200 text-sm font-semibold mb-1">{t("tagline")}</p>
          <p className="text-blue-300 text-xs leading-relaxed">{t("subtitle")}</p>
        </div>
      </div>
      <LangBar/>
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-4 text-sm flex-wrap">
          <span className="text-gray-500"><span className="font-bold text-gray-900">{total}</span> {t("questions")}</span>
          <span className="text-gray-500">📇 {t("flashcards")}</span>
          <span className="text-gray-500">📝 {t("chapters")}</span>
          <span className="text-gray-500">🟢🟡🔴 {t("levels")}</span>
          <span className="font-bold text-green-600">{t("free")}</span>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">{t("allCerts")}</p>
        {certData.categories.map(cat=>{
          const meta=META[cat.id]||{};
          return(
            <button key={cat.id} onClick={()=>openHub(cat)}
              className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all"
              style={{borderLeftWidth:4,borderLeftColor:cat.color}}>
              <div className="p-4 flex items-center gap-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm">{cat.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{backgroundColor:cat.bg,color:cat.color}}>{cat.count} {t("questions")}</span>
              </div>
              {"fee" in meta&&(
                <div className="px-4 pb-3 pt-1 flex items-center gap-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{t("fee").replace("💰 ","")}: <span className="font-semibold text-gray-700">{(meta as typeof META[string]).fee}</span></span>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-gray-400">{(meta as typeof META[string]).timeToStudy}</span>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs font-semibold" style={{color:cat.color}}>📇 📝</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400 leading-relaxed">
          {t("footer")}<br/>
          <span className="font-medium">Jàng</span> ({t("jangMeans").split("Jàng")[1]?.replace(/[()]/g,"")||"Wolof: to study"})
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
