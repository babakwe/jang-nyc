"use client";
import { useState, useMemo } from "react";
import certData from "./data/certifications.json";

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
    fee:"$200",feeNote:"NYS Unified Court System exam fee",
    where:"111 Centre Street, Manhattan — Room 1189",
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
  const qs=ALL[cat.id]||[];
  const cards=useMemo(()=>{
    const all=qs.map((q,i)=>({
      front:q.q,
      back:(q.choices[q.answer]||"")+"\n\n"+(q.exp||""),
      ch:chOf(cat.id,i,qs.length)
    }));
    return ch?all.filter(c=>c.ch===ch):all;
  },[cat.id,ch,qs]);
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
        <h2 className="text-xl font-black mb-2" style={{color:cat.color}}>Deck complete!</h2>
        <p className="text-gray-500 mb-6">{got} got it · {rev} to review</p>
        <div className="flex gap-3">
          <button onClick={()=>{setIdx(0);setFlip(false);setGot(0);setRev(0);}} className="flex-1 py-3 rounded-xl font-bold text-white" style={{backgroundColor:cat.color}}>Restart</button>
          <button onClick={onBack} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600">← Back</button>
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
            {flip?"Answer — tap to go back":"Question — tap to reveal answer"}
          </span>
          <p className="text-gray-900 font-semibold leading-relaxed text-base whitespace-pre-line">{flip?card.back:card.front}</p>
          {!flip&&<div className="absolute bottom-4 right-4 text-gray-300 text-2xl">↺</div>}
        </button>
        {flip?(
          <div className="flex gap-3">
            <button onClick={()=>mark(false)} className="flex-1 py-4 rounded-xl font-bold bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100">↺ Review again</button>
            <button onClick={()=>mark(true)} className="flex-1 py-4 rounded-xl font-bold bg-green-50 border-2 border-green-200 text-green-700 hover:bg-green-100">✓ Got it</button>
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
  const q=qs[idx];
  const ok=picked===q?.answer;
  function choose(i:number){if(picked!==null||!q)return;setPicked(i);if(i===q.answer)setScore(s=>s+1);}
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
          <h2 className="text-2xl font-black mb-1" style={{color:cat.color}}>{pass?"Nice work!":"Keep studying!"}</h2>
          <p className="text-gray-500 mb-4">{score}/{qs.length} correct · {pct}%</p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:pass?"#16a34a":"#f59e0b"}}/>
          </div>
          <a href={pass?meta.bookUrl:meta.studyUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-white font-bold text-center mb-3 hover:opacity-90" style={{backgroundColor:cat.color}}>
            {pass?"📅 Book your exam →":"📖 Official study guide →"}
          </a>
          <button onClick={onBack} className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-600">← Try another level</button>
        </div>
      </div>
    );
  }
  const diffLabel={easy:"🟢 Easy",medium:"🟡 Medium",hard:"🔴 Hard"}[diff];
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
            <p className="text-xs font-bold text-amber-700 mb-1">{ok?"✓ Correct":"✗ Wrong"} — Why</p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
          </div>
        )}
        {picked!==null&&(
          <button onClick={next} className="w-full py-4 rounded-xl font-black text-white hover:opacity-90" style={{backgroundColor:cat.color}}>
            {idx+1<qs.length?"Next →":"See Results"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Study hub: chapters + mode + difficulty ───────────────────────────────
function StudyHub({cat,onBack}:{cat:Cat&{color:string;bg:string};onBack:()=>void}){
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
        {([["easy","🟢","Easy","Foundational concepts — new to this topic"],
           ["medium","🟡","Medium","Core material — what the exam focuses on"],
           ["hard","🔴","Hard","Advanced questions — exam-ready challenge"]] as const).map(([d,emoji,label,desc])=>(
          <button key={d} onClick={()=>setDiff(d as Diff)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 flex items-center gap-4 active:scale-[0.99] transition-all">
            <span className="text-3xl">{emoji}</span>
            <div className="flex-1"><div className="font-bold text-gray-900">{label}</div><div className="text-sm text-gray-500 mt-0.5">{desc}</div></div>
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

// ── Exam hub ──────────────────────────────────────────────────────────────
function ExamHub({cat,onStudy,onBack}:{cat:Cat;onStudy:()=>void;onBack:()=>void}){
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
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Official resources</h3>
          {[{icon:"🏛",label:"Official exam page",url:meta.officialUrl},{icon:"📖",label:"Official study guide",url:meta.studyUrl},{icon:"📅",label:"Book your exam",url:meta.bookUrl}].map(({icon,label,url})=>(
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
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Practice with us — free</h3>
          <p className="text-xs text-gray-500 mb-4">{count} questions · flashcards · chapter quizzes · 3 difficulty levels</p>
          <button onClick={onStudy} className="w-full py-4 rounded-xl font-black text-white text-base hover:opacity-90" style={{backgroundColor:cat.color}}>
            📚 Start Studying →
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center px-4 pb-6 leading-relaxed">
          Practice only. Verify current fees and requirements with the official agency before registering.
        </p>
      </div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────
export default function Home(){
  type S="home"|"hub"|"study";
  const [screen,setScreen]=useState<S>("home");
  const [active,setActive]=useState<Cat|null>(null);
  function openHub(cat:Cat){setActive(cat);setScreen("hub");}
  const fullCat=active?{...active,...(META[active.id]||{})}:null;
  if(screen==="hub"&&active)return <ExamHub cat={active} onStudy={()=>setScreen("study")} onBack={()=>setScreen("home")}/>;
  if(screen==="study"&&fullCat)return <StudyHub cat={fullCat as Cat&{color:string;bg:string}} onBack={()=>setScreen("hub")}/>;
  const total=certData.categories.reduce((s,c)=>s+c.count,0);
  return(
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-12 pb-8" style={{background:"linear-gradient(135deg, #003087 0%, #0052A5 100%)"}}>
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-3xl font-black text-white mb-1">Jàng NYC</h1>
          <p className="text-blue-200 text-sm font-semibold mb-1">Free License &amp; Certification Prep</p>
          <p className="text-blue-300 text-xs leading-relaxed">
            Tap a certification → see fee, location, official links · then study with flashcards or chapter quizzes.
          </p>
        </div>
      </div>
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-4 text-sm flex-wrap">
          <span className="text-gray-500"><span className="font-bold text-gray-900">{total}</span> questions</span>
          <span className="text-gray-500">📇 Flashcards</span>
          <span className="text-gray-500">📝 Chapter quizzes</span>
          <span className="text-gray-500">🟢🟡🔴 3 levels</span>
          <span className="font-bold text-green-600">Free</span>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">NYC Licenses &amp; Certifications</p>
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
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{backgroundColor:cat.bg,color:cat.color}}>{cat.count} Qs</span>
              </div>
              {"fee" in meta&&(
                <div className="px-4 pb-3 pt-1 flex items-center gap-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">Fee: <span className="font-semibold text-gray-700">{(meta as typeof META[string]).fee}</span></span>
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
          Free for everyone · no account needed · verify fees with official agencies
          <br/><span className="font-medium">Jàng</span> (Wolof: &ldquo;to study&rdquo;) · also available as a mobile app
        </p>
      </div>
    </div>
  );
}
