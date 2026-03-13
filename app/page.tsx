"use client";
import { useState, useEffect, useCallback, useRef, Suspense, ReactNode, ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import ResultsDisplay from "@/components/results-display";

// ── TYPES ───────────────────────────────────────────────────────
type Season = "Identity" | "Exploration" | "Influence" | "Multiplication";
type Alignment = "Behind" | "Aligned" | "Ahead";
type ProfileKey = `${Season}_${Alignment}`;
type SeasonConfidence = "high" | "medium" | "low";

interface ResultData {
  profile: { name: string; mirrorLine: string; description: string; question: string };
  behavioral: Season;
  eStage: string;
  pStage: string;
  gap: string | null;
  mismatch: string | null;
  seasonConfidence: SeasonConfidence;
  seasonConfirmationScore: number;
  lifeEventCount: number;
}

// ── TOKENS ─────────────────────────────────────────────────────
const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

// ── STATIC DATA ─────────────────────────────────────────────────
const seasonDescriptions: Record<string, string> = {
  Identity:       "Building the foundation — clarifying who you are, what you believe, and how you connect with others.",
  Exploration:    "Getting reps — trying things widely, taking on responsibility, learning what fits and what doesn't.",
  Influence:      "Going deep — focused, in your lane, using your expertise and passion to make a specific difference.",
  Multiplication: "Passing it on — investing in others, giving away what you've built, multiplying your impact through people.",
};

const selfConfirmOptions = [
  { id:"A", season:"Identity",       text:"I'm still figuring out who I am and what I believe. I'm drawn to new experiences but don't have a clear sense of direction yet." },
  { id:"B", season:"Exploration",    text:"I'm trying a lot of things — new roles, new environments, new responsibilities. I'm getting reps and learning what fits." },
  { id:"C", season:"Influence",      text:"I know my lane. I'm more focused than I used to be, saying no more than I used to, and going deeper on what I'm good at." },
  { id:"D", season:"Multiplication", text:"I find more energy in helping others grow than doing everything myself. My biggest impact might be through other people now." },
];

const lifeEvents = [
  "Moved","Changed jobs","Graduated","Changed industries",
  "Promoted","Lost a job","Got married or remarried",
  "Had a child","Lost someone close to me","Health crisis",
  "Started a business","Retired","None of these",
];

const birthYears = Array.from({length:70},(_,i)=>String(new Date().getFullYear()-16-i));
const birthMonths = [
  {v:"01",l:"January"},{v:"02",l:"February"},{v:"03",l:"March"},
  {v:"04",l:"April"},{v:"05",l:"May"},{v:"06",l:"June"},
  {v:"07",l:"July"},{v:"08",l:"August"},{v:"09",l:"September"},
  {v:"10",l:"October"},{v:"11",l:"November"},{v:"12",l:"December"},
];

function getDays(month: string, year: string) {
  if (!month) return Array.from({length:31},(_,i)=>i+1);
  return Array.from(
    { length: new Date(parseInt(year)||2000, parseInt(month,10), 0).getDate() },
    (_,i) => i+1
  );
}

const genderOptions       = ["Male","Female","Prefer not to say"];
const relationshipOptions = ["Single","Married","Partnered","Divorced","Widowed","Prefer not to say"];

// ── SEASON CONFIRMATION QUESTIONS (tailored per presumed season) ──
const seasonConfirmationQuestions: Record<string, Array<{id: string; text: string; bs?: boolean}>> = {
  Identity: [
    {id:"sc1",text:"I'm actively clarifying what I believe and what I'm willing to stand behind."},
    {id:"sc2",text:"I'm building consistency between what I say and what I do."},
    {id:"sc3",text:"I've had a conversation recently where I was honest about who I am — even when it was uncomfortable."},
    {id:"sc4",text:"I'm investing in relationships that challenge me to understand myself better."},
    {id:"sc5",text:"This season has been completely fulfilling in every way.",bs:true},
  ],
  Exploration: [
    {id:"sc1",text:"I've said yes to something in the last few months that I didn't feel ready for."},
    {id:"sc2",text:"I'm discovering how I best contribute — not just what's available."},
    {id:"sc3",text:"I'm building competency on purpose, not just collecting experiences."},
    {id:"sc4",text:"I've gotten feedback recently that helped me see how I'm different from the people around me."},
    {id:"sc5",text:"I'm perfectly satisfied with where I'm at — I don't wish for anything different.",bs:true},
  ],
  Influence: [
    {id:"sc1",text:"I spend the majority of my time doing the work I'm most effective at."},
    {id:"sc2",text:"I've clarified where I should say no, and I do it consistently."},
    {id:"sc3",text:"I've turned down a good opportunity recently because it didn't fit where I'm headed."},
    {id:"sc4",text:"I'm actively thinking about how to get more done through others."},
    {id:"sc5",text:"It's always easy for me to do what's asked.",bs:true},
  ],
  Multiplication: [
    {id:"sc1",text:"I've made time for someone behind me in the last month — not because I had to, but because I chose to."},
    {id:"sc2",text:"I could name who I'm investing in right now."},
    {id:"sc3",text:"I'm passing on stories and principles, not just instructions."},
    {id:"sc4",text:"I care more about the mission outlasting me than about my role in it."},
    {id:"sc5",text:"I'm completely satisfied with every area of my life.",bs:true},
  ],
};

// ── EXPERTISE & PASSION QUESTIONS ─────────────────────────────────
interface Question {
  id: string;
  text: string;
  stage?: string;
  season?: string;
  inverse?: boolean;
  bs?: boolean;
  split?: { work: string; personal: string };
}

// A "display card" is a single full-screen question card.
// Split questions become two cards (work + personal), each with their own answer key.
interface DisplayCard {
  id: string;        // answer key (e.g. "e7_work", "e7_personal", or "e1")
  text: string;
  section: "expertise" | "passion";
}

function expandToCards(questions: Question[], section: "expertise" | "passion"): DisplayCard[] {
  const cards: DisplayCard[] = [];
  for (const q of questions) {
    if (q.split) {
      cards.push({ id: `${q.id}_work`, text: q.split.work, section });
      cards.push({ id: `${q.id}_personal`, text: q.split.personal, section });
    } else {
      cards.push({ id: q.id, text: q.text, section });
    }
  }
  return cards;
}

// Questions stored by ID for scoring. Display order is defined separately below.
const questionsById: Record<string, Question> = {
  e1: {id:"e1",text:"I regularly invest time improving my craft, even when no one is asking me to.",stage:"Influence"},
  e2: {id:"e2",text:"In the last month, someone came to me specifically because of a skill they know I have.",stage:"Influence"},
  e3: {id:"e3",text:"I'm more interested in getting reps than getting recognition right now.",stage:"Exploration"},
  e4: {id:"e4",text:"I find more energy in teaching others what I know how to do than in doing it myself.",stage:"Multiplication"},
  e5: {id:"e5",text:"I deliberately practice the fundamentals of my work, even when I already feel competent.",stage:"Influence"},
  e6: {id:"e6",text:"I've turned down a good opportunity in the last year because it didn't fit where I'm headed.",stage:"Influence"},
  e7: {id:"e7",text:"",stage:"Influence",split:{work:"The people I work with would say they know exactly how I contribute.",personal:"The people closest to me would say they know exactly how I contribute."}},
  e8: {id:"e8",text:"If someone asked what I'm best at, I'd have to think about it.",stage:"Identity",inverse:true},
  e9: {id:"e9",text:"I'm satisfied with the level of expertise I've developed and don't feel much need to keep growing.",stage:"BS",bs:true},
  p1: {id:"p1",text:"There's a specific person or group I've shown up for repeatedly — not because I had to, but because I chose to.",stage:"Influence"},
  p2: {id:"p2",text:"I notice problems in the world that bother me more than they seem to bother others.",stage:"Identity"},
  p3: {id:"p3",text:"I've recently given time, money, or energy to something that didn't benefit me directly.",stage:"Exploration"},
  p4: {id:"p4",text:"",stage:"Influence",split:{work:"My passion and my professional work feel meaningfully connected.",personal:"My passion and my personal life feel meaningfully connected."}},
  p5: {id:"p5",text:"I've walked away from something I cared about because it wasn't the thing I cared about most.",stage:"Influence"},
  p6: {id:"p6",text:"I get more energy from investing in someone else's growth than advancing my own work.",stage:"Multiplication"},
  p7: {id:"p7",text:"I haven't yet found the thing I'd sacrifice comfort for.",stage:"Identity",inverse:true},
  p8: {id:"p8",text:"The cause or people I care about would say I show up for them consistently and without reservation.",stage:"BS",bs:true},
};

// Lists for scoring (original order by ID)
const questions = {
  expertise: [questionsById.e1,questionsById.e2,questionsById.e3,questionsById.e4,questionsById.e5,questionsById.e6,questionsById.e7,questionsById.e8,questionsById.e9] as Question[],
  passion:   [questionsById.p1,questionsById.p2,questionsById.p3,questionsById.p4,questionsById.p5,questionsById.p6,questionsById.p7,questionsById.p8] as Question[],
};

// Shuffled display order so same-season questions aren't adjacent
const expertiseDisplayOrder: Question[] = [
  questionsById.e3, questionsById.e1, questionsById.e8, questionsById.e5,
  questionsById.e4, questionsById.e2, questionsById.e7, questionsById.e6,
  questionsById.e9,
];
const passionDisplayOrder: Question[] = [
  questionsById.p2, questionsById.p1, questionsById.p3, questionsById.p7,
  questionsById.p4, questionsById.p6, questionsById.p5, questionsById.p8,
];

// ── SCORING ────────────────────────────────────────────────────
const seasonOrder: Record<string, number> = {Identity:0,Exploration:1,Influence:2,Multiplication:3};

function getPresumedSeason(birthYear: number): Season {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age <= 20) return "Identity";
  if (age <= 39) return "Exploration";
  if (age <= 59) return "Influence";
  return "Multiplication";
}

function determineSeason(
  presumed: Season,
  selfSelect: Season,
  confirmationAvg: number
): { season: Season; confidence: SeasonConfidence } {
  let season: Season;
  let confidence: SeasonConfidence;

  const diff = Math.abs(seasonOrder[presumed] - seasonOrder[selfSelect]);

  if (presumed === selfSelect) {
    season = presumed;
    confidence = "high";
  } else if (diff === 1) {
    season = selfSelect;
    confidence = "medium";
  } else {
    season = presumed;
    confidence = "low";
  }

  // Confirmation score can downgrade confidence
  if (confirmationAvg < 3.5 && confidence === "high") {
    confidence = "medium";
  }
  if (confirmationAvg < 3.0) {
    confidence = "low";
  }

  return { season, confidence };
}

function computeStage(section: "expertise" | "passion", ans: Record<string, number>) {
  const s: Record<string, number> = {Identity:0,Exploration:0,Influence:0,Multiplication:0};
  (questions[section] as Question[]).filter(q=>!q.bs).forEach(q=>{
    if (!q.stage||q.stage==="BS") return;
    if (q.split) {
      // Average work + personal scores
      const workVal = ans[`${q.id}_work`] || 3;
      const persVal = ans[`${q.id}_personal`] || 3;
      const v = (workVal + persVal) / 2;
      s[q.stage] = (s[q.stage]||0) + (q.inverse ? 6 - v : v);
    } else {
      const v = q.inverse ? 6 - (ans[q.id]||3) : (ans[q.id]||3);
      s[q.stage] = (s[q.stage]||0) + v;
    }
  });
  return Object.entries(s).sort((a,b)=>b[1]-a[1])[0][0];
}

function getAlignment(stage: string, season: string): Alignment {
  const d=seasonOrder[stage]-seasonOrder[season];
  return d<0?"Behind":d>0?"Ahead":"Aligned";
}
function getOverallAlignment(eS: string, pS: string, season: string): Alignment {
  const eA=getAlignment(eS,season), pA=getAlignment(pS,season);
  if (eA==="Aligned"&&pA==="Aligned") return "Aligned";
  if ((eA==="Behind"||pA==="Behind")&&eA!=="Ahead"&&pA!=="Ahead") return "Behind";
  if ((eA==="Ahead"||pA==="Ahead")&&eA!=="Behind"&&pA!=="Behind") return "Ahead";
  return "Aligned";
}

// ── PROFILES ───────────────────────────────────────────────────
const profiles: Record<string, {name: string; mirrorLine: string; description: string; question: string}> = {
  Identity_Behind:        {name:"Foundation",        mirrorLine:"You're in the foundation season, but you haven't started building yet.",                 description:"Something is keeping you from the work of this season — whether that's distraction, discomfort, or just not knowing where to start. The foundation isn't optional. It's not something you come back and build later. The good news is that you're not behind — you're here, and here is exactly where this starts.",                                                                                         question:"What would I need to believe about myself to actually begin?"},
  Identity_Aligned:       {name:"Groundwork",        mirrorLine:"You're doing the hardest work there is — and it doesn't look like much yet.",             description:"The foundation season is easy to underestimate, mostly because it's invisible. Nobody builds a house because they're excited about concrete. But without what gets built here — a clear sense of who you are, what you believe, how you connect — everything else wobbles. You're in it. Stay in it.",                                                                                                          question:"What do I believe about myself that I haven't said out loud yet?"},
  Identity_Ahead:         {name:"Ahead of Yourself", mirrorLine:"You're reaching for influence before the foundation is ready to hold it.",                 description:"The ambition is real, and there's nothing wrong with it. But the drive to get to the next thing is moving faster than the work of this season. What gets skipped here doesn't disappear — it shows up later, under more pressure, with higher stakes. The fastest way forward right now is to slow down enough to build something that holds.",                                                               question:"What am I hoping to skip, and what will it cost me later?"},
  Exploration_Behind:     {name:"Waiting to Launch", mirrorLine:"You're in a season built for saying yes — and you keep saying not yet.",                   description:"Exploration is the one season where playing it safe is the riskiest thing you can do. The whole point is to get reps, try things, and learn from what doesn't work. Waiting for the right opportunity, the right moment, or the right level of readiness is a way of staying comfortable in a season designed for discomfort. The reps don't come to you.",                                                question:"What would I try if I knew failure wasn't the worst outcome?"},
  Exploration_Aligned:    {name:"Wide Open",         mirrorLine:"You're fully in the middle of it — and it's supposed to feel this way.",                   description:"Exploration is the most misunderstood season. From the outside it looks scattered. From the inside it can feel like falling behind. It's neither. You're building the dots you'll connect later. The work of this season isn't to find your lane — it's to earn the right to pick one. Keep going.",                                                                                           question:"What am I learning about myself that I couldn't have learned any other way?"},
  Exploration_Ahead:      {name:"Ready to Land",     mirrorLine:"You're trying to land the plane before you've mapped the territory.",                       description:"There's a pull toward focus, toward picking a lane, toward being done with the wandering. That's understandable — but it's early. Forcing a conclusion in this season produces answers that feel right for about six months. The jello hasn't set yet. The explorers who resist the urge to narrow too soon are the ones who enter Influence with real authority.",                                             question:"What am I afraid I'll find if I keep exploring?"},
  Influence_Behind:       {name:"More to Give",      mirrorLine:"You've earned the right to narrow — you're just not using it yet.",                         description:"You're in the season of focus but still operating like an explorer. Still saying yes to too much, still spreading across too many directions. The reps are done. The season has changed. Staying in wide-open mode now isn't humility — it's avoidance. You have something specific to offer. The world needs you to offer it specifically.",                                                        question:"What would I stop doing tomorrow if I actually trusted what I'm good at?"},
  Influence_Aligned:      {name:"In the Pocket",     mirrorLine:"Your season, your expertise, and your passion are unusually well-aligned right now.",       description:"That's rare and worth acknowledging. The risk for people in this position isn't falling behind — it's coasting. Integration can quietly become complacency. The question worth sitting with isn't what do I need to fix. It's what do I need to protect.",                                                                                                                                     question:"What would I do with my time if I stopped doing everything out of obligation?"},
  Influence_Ahead:        {name:"Running on Fumes",  mirrorLine:"You're thinking about giving it away before you've fully used it.",                         description:"There's a pull toward the next season — toward mentoring, stepping back, letting others lead. That's worth paying attention to. But it's worth asking whether that pull is coming from wisdom or exhaustion. Multiplication is a season, not an escape. The most effective multipliers finished their season of Influence before they moved on.",                                                    question:"Am I ready to step back, or am I just tired?"},
  Multiplication_Behind:  {name:"Holding the Reins", mirrorLine:"You're in the season of passing it on — and you're still holding on.",                     description:"The transition out of Influence is the hardest one. The work is familiar, the role is comfortable, and letting go feels like loss. But the window to make this transition gracefully doesn't stay open forever. The people behind you need what you know more than they need you to stay in charge. What looks like loyalty to the work may be costing the mission.",                             question:"What am I holding onto — and who is it actually serving?"},
  Multiplication_Aligned: {name:"Passing It On",     mirrorLine:"The shift you've made is rarer than you think — and more important than it looks.",         description:"Most people in your position either hang on too long or check out entirely. You're doing something harder than both — staying engaged differently. Your energy goes into people now, not output. That's not a step down. It's the season with the longest reach. What you invest in others will outlast almost anything you could have done yourself.",                                           question:"Who is a season or two behind me that I haven't made time for yet?"},
  Multiplication_Ahead:   {name:"Not Done Yet",      mirrorLine:"You've mentally moved on before this season is finished.",                                  description:"There's a version of checking out that looks like wisdom from the outside. It has the right vocabulary — legacy, investment, stepping back. But it's still checking out. Multiplication is not retirement. There's still significant work to do, and you're in a position few people ever reach. The question isn't whether you've earned the right to slow down. It's whether slowing down is what this season actually needs from you.", question:"What would I regret not doing while I still have the energy and the access to do it?"},
};

function getProfile(season: string, eS: string, pS: string){
  const key=`${season}_${getOverallAlignment(eS,pS,season)}`;
  return profiles[key]||profiles[`${season}_Aligned`];
}
function getGapLanguage(eS: string, pS: string, season: string){
  const eA=getAlignment(eS,season),pA=getAlignment(pS,season);
  if (eA===pA) return null;
  return seasonOrder[eS]>seasonOrder[pS]
    ?"One thing worth noting: your expertise is further along than your passion right now. You're developing real capability — but the why underneath it is still forming. Skill without a cause can start to feel like running without a destination."
    :"One thing worth noting: your passion is ahead of your expertise right now. You know what you care about — but the craft to do something meaningful about it is still being built. The cause deserves a skill worthy of it.";
}
function getMismatchLanguage(self: string | null, behavioral: string){
  if (!self||self===behavioral) return null;
  const diff=Math.abs(seasonOrder[self]-seasonOrder[behavioral]);
  return diff===1
    ?`You described yourself as being in the ${self} season — and in a lot of ways, that's accurate. Your answers suggest you may still be doing some of the work of ${behavioral} alongside it. Seasons don't always have clean edges.`
    :`You described yourself as being in the ${self} season. Your answers paint a slightly different picture — one that looks more like ${behavioral}. The gap between where we think we are and where we actually are is often the most useful thing this can surface.`;
}

function getConfidenceNarrative(season: string, confidence: SeasonConfidence): string {
  if (confidence === "high") return `You're in the season of ${season}.`;
  if (confidence === "medium") return `You're most likely in the season of ${season}, though your answers suggest you may be navigating a transition.`;
  return `Based on where you are in life, you're likely in the season of ${season} — though your answers suggest you may be revisiting some earlier work. That's not uncommon, especially during periods of change.`;
}

function getDivergenceNarrative(eStage: string, pStage: string, lifeEventCount: number): string | null {
  if (eStage === pStage) return null;
  const eDesc = seasonDescriptions[eStage] || eStage;
  const pDesc = seasonDescriptions[pStage] || pStage;
  const context = lifeEventCount >= 2 ? "significant life transitions" : "multiple responsibilities or new chapters";
  return `Your expertise and passion are in different places right now. Your expertise looks like ${eStage}: ${eDesc.charAt(0).toLowerCase() + eDesc.slice(1)} But your passion looks like ${pStage}: ${pDesc.charAt(0).toLowerCase() + pDesc.slice(1)} That's not unusual — especially for people navigating ${context}. The work isn't to force them together. It's to be honest about where each one is.`;
}

function getLifeEventsNarrative(lifeEventCount: number): string | null {
  if (lifeEventCount < 3) return null;
  return "You're carrying a lot of transitions right now. That can make your season feel less clear — not because you're in the wrong one, but because this one is asking a lot of you.";
}

const likertLabels = ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"];

// ── SMALL COMPONENTS ───────────────────────────────────────────
function DotCloud() {
  const dots=[[52,8,5],[72,14,4],[38,22,3.5],[58,26,4.5],[78,30,3],[30,38,3],[50,40,5],[68,42,4],[84,36,3.5],[22,52,3],[42,56,3.5],[62,54,4],[78,58,5],[90,50,3],[34,68,3],[54,66,4],[70,70,3.5],[85,68,3],[46,80,3.5],[64,82,4]];
  return (
    <svg viewBox="0 0 120 100" style={{width:180,height:145,opacity:0.17,position:"absolute",top:-40,right:-50,pointerEvents:"none"}}>
      {dots.map(([cx,cy,r],i)=><circle key={i} cx={cx} cy={cy} r={r} fill="#4A4742"/>)}
      <circle cx={78} cy={54} r={5.5} fill="#B22234"/>
    </svg>
  );
}

function BackArrow({onClick}: {onClick: () => void}) {
  return (
    <button onClick={onClick} aria-label="Go back" style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:36,height:36,borderRadius:"50%",flexShrink:0,
      background:"rgba(178,34,52,0.09)",border:"none",
      cursor:"pointer",color:C.red,transition:"background 0.15s",
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// Shared top-bar used on ALL non-landing screens
// Matches question pages: back arrow left, optional label right
function TopBar({onBack, label=""}: {onBack: () => void; label?: string}) {
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"14px 20px 0",marginBottom:28,
    }}>
      <BackArrow onClick={onBack}/>
      {label && (
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,
          letterSpacing:"0.1em",textTransform:"uppercase",color:C.sage}}>
          {label}
        </span>
      )}
      {/* spacer to keep label centered */}
      {label ? <div style={{width:36}}/> : <div/>}
    </div>
  );
}

function PrimaryBtn({children,onClick,disabled}: {children: ReactNode; onClick: () => void; disabled?: boolean}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:"100%",height:50,borderRadius:10,border:"none",
      fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,
      background:disabled?"#DDD9D2":C.red,
      color:disabled?C.inkLight:"white",
      cursor:disabled?"not-allowed":"pointer",
      transition:"background 0.15s",letterSpacing:"0.01em",
    }}>{children}</button>
  );
}


function FieldLabel({children}: {children: ReactNode}) {
  return <label style={{display:"block",fontSize:13,fontWeight:600,color:C.ink,marginBottom:7}}>{children}</label>;
}

// Native select with custom chevron — no focus issues on iOS
function NativeSelect({label, value, onChange, children, style={}}: {label?: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode; style?: React.CSSProperties}) {
  return (
    <div style={style}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div style={{position:"relative"}}>
        <select
          value={value}
          onChange={onChange}
          style={{
            width:"100%",height:50,
            border:`1.5px solid ${value ? C.ink : C.border}`,
            borderRadius:10,padding:"0 36px 0 14px",
            fontFamily:"'DM Sans',sans-serif",fontSize:16,
            color:value?C.ink:"#C4C0BB",
            background:C.white,
            WebkitAppearance:"none",appearance:"none",
            outline:"none",cursor:"pointer",
            // Prevent iOS zoom on focus (font-size >= 16px handles it)
          }}
        >
          {children}
        </select>
        <svg style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
          width="12" height="7" viewBox="0 0 12 7" fill="none">
          <path d="M1 1l5 5 5-5" stroke={C.inkLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

// Text input — font-size 16px prevents iOS zoom
function TextInput({label, value, onChange, placeholder, type="text", autoComplete, inputMode, style={}}: {label?: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; placeholder: string; type?: string; autoComplete?: string; inputMode?: string; style?: React.CSSProperties}) {
  return (
    <div style={style}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
        style={{
          width:"100%",height:50,
          border:`1.5px solid ${value ? C.ink : C.border}`,
          borderRadius:10,padding:"0 14px",
          fontFamily:"'DM Sans',sans-serif",fontSize:16,
          color:C.ink,background:C.white,
          WebkitAppearance:"none",appearance:"none",outline:"none",
          transition:"border-color 0.15s",
        }}
        onFocus={e=>e.target.style.borderColor=C.red}
        onBlur={e=>e.target.style.borderColor=value?C.ink:C.border}
      />
    </div>
  );
}


function PoweredBy() {
  return (
    <div style={{textAlign:"center",padding:"30px 0 4px",fontSize:11,
      fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
      textTransform:"uppercase"}}>
      <a href="https://thirdspacepublishing.com" target="_blank" rel="noopener noreferrer"
        style={{color:C.inkLight,textDecoration:"none",transition:"color 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.color=C.ink}
        onMouseLeave={e=>e.currentTarget.style.color=C.inkLight}>
        Powered by Third Space
      </a>
    </div>
  );
}

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#F0EDE8;font-family:'DM Sans',system-ui,sans-serif;color:#1C1B19;-webkit-font-smoothing:antialiased}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp 0.3s ease-out both}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:0.6}}
  select option{color:#1C1B19}
  input::placeholder{color:#C4C0BB}
  button:active{opacity:0.85}
  /* Remove iOS tap highlight */
  *{-webkit-tap-highlight-color:transparent}
`;

// Body container for non-landing, non-question screens
function Screen({children, maxW=580}: {children: ReactNode; maxW?: number}) {
  return (
    <div className="fu" style={{maxWidth:maxW,margin:"0 auto",padding:"0 22px 64px"}}>
      {children}
    </div>
  );
}

function SectionTitle({children}: {children: ReactNode}) {
  return (
    <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
      fontSize:"clamp(22px,4vw,30px)",fontWeight:600,lineHeight:1.25,
      color:C.ink,marginBottom:10}}>{children}</h2>
  );
}

function BodyText({children, style={}}: {children: ReactNode; style?: React.CSSProperties}) {
  return (
    <p style={{fontSize:15,lineHeight:1.68,color:C.inkMid,marginBottom:22,...style}}>{children}</p>
  );
}

function Card({children, style={}}: {children: ReactNode; style?: React.CSSProperties}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,
      padding:24,boxShadow:"0 1px 8px rgba(28,27,25,0.05)",marginBottom:16,...style}}>
      {children}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────
function AppInner() {
  const searchParams = useSearchParams();
  const isRetake = searchParams.get("retake") === "true";
  const autoSkipDone = useRef(false);

  // step: 0=landing 1=email 2=name 3=context 4=life events 5=self-season 6=season confirmation 7=questions(expertise+passion) 8=processing 9=results
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<{
    name: string; email: string;
    dobMonth: string; dobDay: string; dobYear: string;
    gender: string; vocation: string; relationship: string;
    lifeEvents: string[]; selfSeason: string | null;
  }>({
    name:"", email:"",
    dobMonth:"", dobDay:"", dobYear:"",
    gender:"", vocation:"", relationship:"",
    lifeEvents:[], selfSeason:null,
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [qIndex,  setQIndex]  = useState(0);
  const [scIndex, setScIndex] = useState(0); // season confirmation question index
  const [result,  setResult]  = useState<ResultData | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  // Whether demographics were loaded from a previous assessment (skip demographics step)
  const [hasProfile, setHasProfile] = useState(false);
  // Track whether auto-advance is locked (prevents double-fire)
  const [advancing, setAdvancing] = useState(false);
  // Track if saving to server failed after retries
  const [saveFailed, setSaveFailed] = useState(false);
  // Email lookup loading state
  const [lookingUp, setLookingUp] = useState(false);
  // Welcome back name for returning users (shown briefly)
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionCreatedAt = useRef<number | null>(null);
  // UTM params (read on mount)
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";

  // Detect touch/mobile device (no hover capability)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(()=>{
    const mq = window.matchMedia("(hover: none)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return ()=>mq.removeEventListener("change", handler);
  },[]);

  // Check for existing auth session on mount, prefill from previous assessment
  useEffect(()=>{
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } })=>{
      if (!user) return;
      setAuthed(true);
      // Pre-fill form fields from session
      setForm(f=>({
        ...f,
        email: f.email || user.email || "",
        name: f.name || user.user_metadata?.name || "",
      }));
      // Fetch most recent assessment to pre-fill demographics
      let profileFound = false;
      try {
        const res = await fetch(`/api/assessment/profile?email=${encodeURIComponent(user.email || "")}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const p = data.profile;
            setForm(f => ({
              ...f,
              dobYear: p.birth_year ? String(p.birth_year) : f.dobYear,
              gender: p.gender || f.gender,
            }));
            if (p.birth_year) {
              setHasProfile(true);
              profileFound = true;
            }
          }
        }
      } catch {}
      // Auto-skip landing for authed users (retake=true still shows landing)
      if (!autoSkipDone.current && !isRetake) {
        autoSkipDone.current = true;
        setStep(profileFound ? 4 : 3);
      }
    });
  },[]); // eslint-disable-line

  // Derive presumed season from DOB
  const presumedSeason = form.dobYear ? getPresumedSeason(parseInt(form.dobYear)) : null;

  // Get tailored season confirmation questions based on presumed season
  const scQuestions = presumedSeason ? seasonConfirmationQuestions[presumedSeason] : [];

  // Build the question list for step 6 in shuffled display order
  // Split questions expand into two separate full-screen cards
  const allQ: DisplayCard[] = [
    ...expandToCards(expertiseDisplayOrder, "expertise"),
    ...expandToCards(passionDisplayOrder, "passion"),
  ];
  const totalQ = allQ.length; // 19 cards (10 expertise incl e7 split, 9 passion incl p4 split)
  const q = allQ[qIndex];

  // Scroll to top on step/question change
  useEffect(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },[step,qIndex,scIndex]);

  // Get step name for session tracking
  const getStepName = (s: number, scIdx: number, qIdx: number): string => {
    if (s === 0) return "landing";
    if (s === 1) return "email";
    if (s === 2) return "name";
    if (s === 3) return "demographics";
    if (s === 4) return "life_events";
    if (s === 5) return "self_season";
    if (s === 6) return `season_q${scIdx + 1}`;
    if (s === 7) {
      // Determine which question section and index
      const card = allQ[qIdx];
      if (card) return `${card.section}_q${qIdx + 1}`;
      return `question_${qIdx + 1}`;
    }
    if (s === 8) return "processing";
    if (s === 9) return "results";
    return `step_${s}`;
  };

  // Track step changes in session (fire and forget)
  useEffect(() => {
    if (!sessionId || step === 0) return;
    const stepName = getStepName(step, scIndex, qIndex);
    fetch("/api/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        current_step: stepName,
        furthest_step: stepName,
        last_active_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [sessionId, step, scIndex, qIndex]); // eslint-disable-line

  // Compute results when entering processing screen (step 8)
  useEffect(()=>{
    if (step!==8) return;

    // Compute season from new logic
    const selfSelectSeason = (form.selfSeason || "Exploration") as Season;
    const pSeason = presumedSeason || "Exploration";

    // Compute season confirmation score (average of non-BS questions)
    const scQs = seasonConfirmationQuestions[pSeason];
    const nonBsScores = scQs.filter(q=>!q.bs).map(q=>answers[q.id]||3);
    const confirmationAvg = nonBsScores.reduce((a,b)=>a+b,0) / nonBsScores.length;

    const { season: finalSeason, confidence } = determineSeason(pSeason, selfSelectSeason, confirmationAvg);

    const eStage = computeStage("expertise", answers);
    const pStage = computeStage("passion", answers);
    const profile = getProfile(finalSeason, eStage, pStage);
    const gap = getGapLanguage(eStage, pStage, finalSeason);
    const mismatch = getMismatchLanguage(form.selfSeason, finalSeason);
    const lifeEventCount = form.lifeEvents.filter(e => e !== "None of these").length;

    setResult({
      profile,
      behavioral: finalSeason,
      eStage,
      pStage,
      gap,
      mismatch,
      seasonConfidence: confidence,
      seasonConfirmationScore: confirmationAvg,
      lifeEventCount,
    });

    // Split answers into sections and compute scores
    const seasonAnswers: Record<string, number> = {};
    const expertiseAnswers: Record<string, number> = {};
    const passionAnswers: Record<string, number> = {};
    const bsAnswers: Record<string, number> = {};

    // Season confirmation answers
    scQs.forEach(q => {
      if (answers[q.id]) {
        if (q.bs) bsAnswers[q.id] = answers[q.id];
        else seasonAnswers[q.id] = answers[q.id];
      }
    });

    questions.expertise.forEach(q => {
      if (q.split) {
        const wKey = `${q.id}_work`, pKey = `${q.id}_personal`;
        if (answers[wKey]) expertiseAnswers[wKey] = answers[wKey];
        if (answers[pKey]) expertiseAnswers[pKey] = answers[pKey];
      } else {
        if (!answers[q.id]) return;
        if (q.bs) bsAnswers[q.id] = answers[q.id];
        else expertiseAnswers[q.id] = answers[q.id];
      }
    });
    questions.passion.forEach(q => {
      if (q.split) {
        const wKey = `${q.id}_work`, pKey = `${q.id}_personal`;
        if (answers[wKey]) passionAnswers[wKey] = answers[wKey];
        if (answers[pKey]) passionAnswers[pKey] = answers[pKey];
      } else {
        if (!answers[q.id]) return;
        if (q.bs) bsAnswers[q.id] = answers[q.id];
        else passionAnswers[q.id] = answers[q.id];
      }
    });

    const sum = (obj: Record<string, number>) => Object.values(obj).reduce((a, b) => a + b, 0);
    const birthYear = parseInt(form.dobYear) || null;

    // Derive season_cohort from birth year
    let seasonCohort: string | null = null;
    if (birthYear) {
      const age = new Date().getFullYear() - birthYear;
      if (age < 25) seasonCohort = "18-24";
      else if (age < 35) seasonCohort = "25-34";
      else if (age < 45) seasonCohort = "35-44";
      else if (age < 55) seasonCohort = "45-54";
      else if (age < 65) seasonCohort = "55-64";
      else seasonCohort = "65+";
    }

    // Fire API call in the background with retry — don't block the UI
    const payload = {
      email: form.email.trim().toLowerCase(),
      name: form.name,
      birth_year: birthYear,
      gender: form.gender || null,
      life_events: form.lifeEvents,
      feeling_words: form.selfSeason ? [form.selfSeason] : [],
      season_answers: seasonAnswers,
      expertise_answers: expertiseAnswers,
      passion_answers: passionAnswers,
      season_score: sum(seasonAnswers),
      expertise_score: sum(expertiseAnswers),
      passion_score: sum(passionAnswers),
      bs_score: sum(bsAnswers),
      season: finalSeason,
      profile_name: profile.name,
      season_cohort: seasonCohort,
      season_confidence: confidence,
      season_presumed: pSeason,
      season_self_select: selfSelectSeason,
      season_confirmation_score: parseFloat(confirmationAvg.toFixed(2)),
    };
    // Calculate time to complete
    const timeToComplete = sessionCreatedAt.current ? Math.round((Date.now() - sessionCreatedAt.current) / 1000) : null;

    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/assessment/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            console.log("[assessment] Submit succeeded on attempt", attempt + 1);
            if (data.assessment_id) {
              setAssessmentId(data.assessment_id);
              // Update session with completion data
              if (sessionId) {
                fetch("/api/session", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    session_id: sessionId,
                    completed_at: new Date().toISOString(),
                    time_to_complete_seconds: timeToComplete,
                    assessment_result_id: data.assessment_id,
                  }),
                }).catch(() => {});
              }
            }
            return;
          }
          console.warn("[assessment] Submit attempt", attempt + 1, "status:", res.status);
        } catch (err) {
          console.warn("[assessment] Submit attempt", attempt + 1, "error:", err);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
      console.error("[assessment] All 3 submit attempts failed");
      setSaveFailed(true);
    })();

    const t = setTimeout(()=>setStep(9),2600);
    return ()=>clearTimeout(t);
  },[step]); // eslint-disable-line

  // Validation (hoisted above effects that need them)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const nameValid = form.name.trim().length >= 2;
  const birthYearNum = parseInt(form.dobYear);
  const birthYearValid = !!(form.dobYear && birthYearNum >= 1920 && birthYearNum <= new Date().getFullYear() - 10);
  const canEmail = emailValid;
  const canName = nameValid;
  const can3 = form.dobMonth && form.dobDay && birthYearValid;
  const can4 = form.lifeEvents.length > 0;
  const can5 = !!form.selfSeason;
  // Track whether user has attempted to submit each step (for showing inline errors)
  const [triedEmail, setTriedEmail] = useState(false);
  const [triedName, setTriedName] = useState(false);
  const [tried3, setTried3] = useState(false);

  // Auto-advance after answer selection — debounced, locked to prevent double-fire
  const handleAnswer = useCallback((id: string, val: number) => {
    if (advancing) return;
    setAdvancing(true);
    setAnswers(prev=>({...prev,[id]:val}));
    setTimeout(()=>{
      setAdvancing(false);
      if (step === 6) {
        // Season confirmation questions
        if (scIndex < scQuestions.length - 1) setScIndex(i=>i+1);
        else { setQIndex(0); setStep(7); }
      } else {
        // Expertise + passion questions
        if (qIndex < totalQ-1) setQIndex(i=>i+1);
        else setStep(8);
      }
    }, 400);
  },[advancing, qIndex, totalQ, step, scIndex, scQuestions.length]);

  // Keyboard support for question screens (steps 6 and 7)
  useEffect(()=>{
    if (step !== 6 && step !== 7) return;
    const handler = (e: KeyboardEvent) => {
      if (step === 6) {
        const scQ = scQuestions[scIndex];
        if (!scQ) return;
        if (e.key>="1" && e.key<="5") { handleAnswer(scQ.id, Number(e.key)); return; }
        if (e.key==="ArrowLeft") { if(scIndex===0) setStep(5); else setScIndex(i=>i-1); return; }
      } else if (step === 7 && q) {
        if (e.key>="1" && e.key<="5") { handleAnswer(q.id, Number(e.key)); return; }
        if (e.key==="Enter" && answers[q.id]) { handleAnswer(q.id, answers[q.id]); return; }
        if (e.key==="ArrowLeft") { if(qIndex===0) { setScIndex(scQuestions.length-1); setStep(6); } else setQIndex(i=>i-1); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  },[step, q, qIndex, scIndex, scQuestions, handleAnswer, answers]);

  // Keyboard support for pre-assessment screens
  useEffect(()=>{
    if (step<1 || step>5) return;
    const handler = (e: KeyboardEvent) => {
      // Number keys 1-4 to select season on self-season screen
      if (step===5 && e.key>="1" && e.key<="4") {
        const idx = Number(e.key)-1;
        if (selfConfirmOptions[idx]) setForm(f=>({...f,selfSeason:selfConfirmOptions[idx].season}));
        return;
      }
      if (e.key!=="Enter") return;
      // Don't trigger if user is in an input/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag==="SELECT") return;
      if (step===2) {
        setTriedName(true);
        if (canName) setStep(3);
      }
      else if (step===3) {
        setTried3(true);
        if (can3) setStep(4);
      }
      else if (step===4 && can4) setStep(5);
      else if (step===5 && can5) { setScIndex(0); setStep(6); }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  },[step, canName, can3, can4, can5, hasProfile]);

  const toggleEvent = (ev: string) => {
    if (ev==="None of these"){ setForm(f=>({...f,lifeEvents:["None of these"]})); return; }
    setForm(f=>{
      const flt = f.lifeEvents.filter(e=>e!=="None of these");
      return {...f, lifeEvents: flt.includes(ev) ? flt.filter(e=>e!==ev) : [...flt,ev]};
    });
  };

  // Total displayed questions: 5 season confirmation + 19 expertise/passion cards = 24 cards
  const totalDisplayedQ = scQuestions.length + totalQ;

  // Progress bar value — adjust pre-question percentage for returning users
  const skipsEmailStep = authed;
  const skipsDemoStep = authed && hasProfile;
  // Pre-question steps: landing(0), email(1), name(2), demo(3), life(4), self-season(5)
  // Returning users skip some steps, so compress the pre-question range (0-26%)
  const preQuestionPct = (() => {
    if (step === 0) return 0;
    if (step === 1) return 5;
    if (step === 2) return 10;
    if (step === 3) return skipsDemoStep ? (skipsEmailStep ? 8 : 14) : 16;
    if (step === 4) return skipsDemoStep ? (skipsEmailStep ? 12 : 18) : 22;
    if (step === 5) return 26;
    return 26;
  })();
  const progress =
    step <= 5 ? preQuestionPct :
    step===6 ? 26+Math.round((scIndex/totalDisplayedQ)*66) :
    step===7 ? 26+Math.round(((scQuestions.length+qIndex)/totalDisplayedQ)*66) :
    step===8?95 : 100;

  const days = getDays(form.dobMonth, form.dobYear);

  // Gap between stacked fields inside a card
  const fieldGap = {marginBottom:18};

  // Current section label for question screens
  const getSectionLabel = () => {
    if (step === 6) return "Section 1 of 3";
    if (step === 7 && q) {
      return q.section === "expertise" ? "Section 2 of 3" : "Section 3 of 3";
    }
    return "";
  };

  // Current question number across all sections
  const getCurrentQNumber = () => {
    if (step === 6) return scIndex + 1;
    if (step === 7) return scQuestions.length + qIndex + 1;
    return 0;
  };

  return (
    <>
      <style>{globalCss}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>

        {/* Single progress bar */}
        {step>0 && step<9 && (
          <div style={{position:"fixed",top:"env(safe-area-inset-top, 0px)",left:0,right:0,height:3,background:C.border,zIndex:100}}>
            <div style={{height:"100%",background:C.red,width:`${progress}%`,
              transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"}}/>
          </div>
        )}

        {/* ── 0: LANDING ─────────────────────────────────────── */}
        {step===0 && (
          <div className="fu" style={{minHeight:"100vh",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",
            textAlign:"center",padding:"48px 28px",maxWidth:480,margin:"0 auto",
            position:"relative"}}>
            <div style={{position:"absolute",top:16,right:4,display:"flex",alignItems:"center",gap:6}}>
              <button onClick={async()=>{
                const shareData = {title:"The On Purpose Assessment",text:"Take the On Purpose Assessment — a short diagnostic for your clarity and engagement with purpose.",url:"https://onpurposeassessment.com"};
                if (navigator.share) { try { await navigator.share(shareData); } catch {} }
                else { try { await navigator.clipboard.writeText("https://onpurposeassessment.com"); } catch {} }
              }} style={{
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                width:32,height:32,borderRadius:"50%",border:`1.5px solid ${C.border}`,
                background:"transparent",cursor:"pointer",color:C.inkLight,
                transition:"all 0.2s",padding:0,
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink;e.currentTarget.style.color=C.ink;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkLight;}}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M6 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 10v6a2 2 0 002 2h8a2 2 0 002-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <Link href={authed ? "/dashboard" : "/login"} style={{
                fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.06em",
                color:C.inkLight,textDecoration:"none",padding:"6px 10px",
                transition:"color 0.15s",
              }}>{authed ? "Dashboard" : "Sign In"}</Link>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.12em",
              textTransform:"uppercase",color:C.sage,marginBottom:20}}>
              The On Purpose Assessment
            </div>
            <div style={{position:"relative",width:"100%",display:"flex",justifyContent:"center"}}>
              <DotCloud/>
              <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",
                fontSize:"clamp(30px,7vw,46px)",fontWeight:700,lineHeight:1.15,
                color:C.ink,marginBottom:18}}>
                Most people feel behind. This will help you figure out why<span style={{color:C.red}}>.</span>
              </h1>
            </div>
            <p style={{fontSize:16,lineHeight:1.65,color:C.inkMid,marginBottom:36,maxWidth:340}}>
              A short diagnostic for your clarity and engagement with purpose.
            </p>
            <button onClick={()=>{
              if (authed && hasProfile) { setStep(4); }
              else if (authed) { setStep(3); }
              else { setStep(1); }
            }} style={{
              display:"flex",alignItems:"center",justifyContent:"center",
              width:"100%",maxWidth:260,height:50,borderRadius:10,border:"none",
              fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,
              background:C.red,color:"white",cursor:"pointer",letterSpacing:"0.01em",
              transition:"transform 0.2s, background 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.background="#9B1D2E";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.background=C.red;}}
            >Get Started</button>
            <p style={{marginTop:24,fontSize:12,color:C.inkLight}}>
              Based on{" "}
              <a href="https://www.amazon.com/Purpose-Beau-Johnson/dp/B0FRMXCDWS" target="_blank" rel="noopener noreferrer"
                style={{color:C.red,textDecoration:"none",transition:"opacity 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <em>On Purpose</em> by Beau Johnson
              </a>
            </p>
            <PoweredBy/>
          </div>
        )}

        {/* ── 1: EMAIL ─────────────────────────────────────── */}
        {step===1 && !welcomeName && (
          <>
            <TopBar onBack={()=>setStep(0)} label="Let's get started"/>
            <Screen>
              <SectionTitle>What&apos;s your email?</SectionTitle>
              <BodyText style={{marginBottom:16}}>We use this to save your results.</BodyText>
              <Card>
                <TextInput label="Email address" value={form.email} type="email"
                  placeholder="your@email.com" autoComplete="email" inputMode="email"
                  onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,email:e.target.value}))}/>
                {triedEmail && form.email.trim() && !emailValid && (
                  <p style={{fontSize:12,color:C.red,marginTop:5}}>Please enter a valid email address.</p>
                )}
              </Card>
              <PrimaryBtn onClick={async ()=>{
                setTriedEmail(true);
                if (!canEmail || lookingUp) return;
                const trimmedEmail = form.email.trim().toLowerCase();
                setForm(f=>({...f, email: trimmedEmail}));
                setLookingUp(true);
                // Create session for analytics (fire and forget but capture ID)
                const deviceType = /Mobi/i.test(navigator.userAgent) ? (/Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "mobile") : "desktop";
                fetch("/api/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: trimmedEmail,
                    device_type: deviceType,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    referrer: document.referrer || null,
                    utm_source: utmSource || null,
                    utm_medium: utmMedium || null,
                    utm_campaign: utmCampaign || null,
                  }),
                }).then(r => r.json()).then(d => {
                  if (d.session_id) {
                    setSessionId(d.session_id);
                    sessionCreatedAt.current = Date.now();
                  }
                }).catch(() => {});
                try {
                  const res = await fetch("/api/user-lookup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: trimmedEmail }),
                  });
                  const data = await res.json();
                  if (data.found) {
                    // Returning user — pre-fill data
                    if (data.name) setForm(f=>({...f, name: data.name}));
                    if (data.birth_year) setForm(f=>({...f, dobYear: String(data.birth_year)}));
                    if (data.gender) setForm(f=>({...f, gender: data.gender}));
                    if (data.hasFullDemographics) {
                      setHasProfile(true);
                      // Show welcome back moment, then skip to life events
                      if (data.name) {
                        setWelcomeName(data.name);
                        setTimeout(()=>{
                          setWelcomeName(null);
                          setStep(4); // life events
                        }, 1200);
                      } else {
                        // Has demographics but no name — go to name step
                        setStep(2);
                      }
                    } else {
                      // Returning but missing demographics — go to name step (pre-filled)
                      setStep(data.name ? 3 : 2);
                    }
                  } else {
                    // New user — go to name step
                    setStep(2);
                  }
                } catch {
                  // On error, just proceed to name step
                  setStep(2);
                }
                setLookingUp(false);
              }} disabled={lookingUp}>{lookingUp ? "Checking…" : "Continue"}</PrimaryBtn>
              {!isMobile && !lookingUp && <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.inkLight,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
                Press Enter ↵ to continue
              </div>}
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 1 (welcome back moment) ────────────────────────── */}
        {step===1 && welcomeName && (
          <div className="fu" style={{minHeight:"100vh",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",textAlign:"center",padding:"48px 28px"}}>
            <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
              fontSize:"clamp(26px,5vw,36px)",fontWeight:600,lineHeight:1.3,color:C.ink}}>
              Welcome back, {welcomeName}<span style={{color:C.red}}>.</span>
            </h2>
          </div>
        )}

        {/* ── 2: NAME ────────────────────────────────────────── */}
        {step===2 && (
          <>
            <TopBar onBack={()=>{setStep(1);setWelcomeName(null);}} label="Let's get started"/>
            <Screen>
              <SectionTitle>What&apos;s your name?</SectionTitle>
              <Card>
                <TextInput label="Name" value={form.name} placeholder="Your name"
                  autoComplete="name"
                  onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,name:e.target.value}))}/>
                {triedName && !nameValid && (
                  <p style={{fontSize:12,color:C.red,marginTop:5}}>Please enter your name.</p>
                )}
              </Card>
              <PrimaryBtn onClick={()=>{
                setTriedName(true);
                if (!canName) return;
                setForm(f=>({...f, name: f.name.trim()}));
                setStep(hasProfile ? 4 : 3);
              }} disabled={false}>Continue</PrimaryBtn>
              {!isMobile && <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.inkLight,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
                Press Enter ↵ to continue
              </div>}
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 3: PERSONAL CONTEXT ────────────────────────────── */}
        {step===3 && (
          <>
            <TopBar onBack={()=>setStep(skipsEmailStep ? 0 : 2)} label="A bit of context"/>
            <Screen>
              <SectionTitle>Tell us a little more about where you are.</SectionTitle>
              <Card>
                {/* Date of birth — three dropdowns, no native date input */}
                <div style={fieldGap}>
                  <FieldLabel>Date of birth</FieldLabel>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1.4fr",gap:10}}>
                    <NativeSelect value={form.dobMonth}
                      onChange={(e: ChangeEvent<HTMLSelectElement>)=>setForm(f=>({...f,dobMonth:e.target.value,dobDay:""}))}>
                      <option value="">Month</option>
                      {birthMonths.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
                    </NativeSelect>
                    <NativeSelect value={form.dobDay}
                      onChange={(e: ChangeEvent<HTMLSelectElement>)=>setForm(f=>({...f,dobDay:e.target.value}))}>
                      <option value="">Day</option>
                      {days.map(d=><option key={d} value={String(d).padStart(2,"0")}>{d}</option>)}
                    </NativeSelect>
                    <NativeSelect value={form.dobYear}
                      onChange={(e: ChangeEvent<HTMLSelectElement>)=>setForm(f=>({...f,dobYear:e.target.value}))}>
                      <option value="">Year</option>
                      {birthYears.map(y=><option key={y} value={y}>{y}</option>)}
                    </NativeSelect>
                  </div>
                  <p style={{fontSize:11,color:C.inkLight,marginTop:6,fontFamily:"'DM Mono',monospace",letterSpacing:"0.02em"}}>
                    We use this to calibrate your questions — not to put you in a box.
                  </p>
                </div>

                {/* Gender + Relationship — side by side */}
                <div style={{...fieldGap,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <NativeSelect label="Gender" value={form.gender}
                    onChange={(e: ChangeEvent<HTMLSelectElement>)=>setForm(f=>({...f,gender:e.target.value}))}>
                    <option value="">Select</option>
                    {genderOptions.map(g=><option key={g} value={g}>{g}</option>)}
                  </NativeSelect>
                  <NativeSelect label="Relationship status" value={form.relationship}
                    onChange={(e: ChangeEvent<HTMLSelectElement>)=>setForm(f=>({...f,relationship:e.target.value}))}>
                    <option value="">Select</option>
                    {relationshipOptions.map(r=><option key={r} value={r}>{r}</option>)}
                  </NativeSelect>
                </div>

                {/* Vocation */}
                <TextInput label="Current vocation" value={form.vocation}
                  placeholder="What do you do?" autoComplete="organization-title"
                  onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,vocation:e.target.value}))}/>
              </Card>
              {tried3 && form.dobYear && !birthYearValid && (
                <p style={{fontSize:12,color:C.red,marginTop:-8,marginBottom:8}}>Please enter a valid birth year.</p>
              )}
              <PrimaryBtn onClick={()=>{
                setTried3(true);
                if (!can3) return;
                setForm(f=>({...f, vocation: f.vocation.trim()}));
                setStep(4);
              }} disabled={false}>Continue</PrimaryBtn>
              {!isMobile && <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.inkLight,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
                Press Enter ↵ to continue
              </div>}
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 4: LIFE EVENTS ─────────────────────────────────── */}
        {step===4 && (
          <>
            <TopBar onBack={()=>setStep(skipsDemoStep ? 0 : 3)} label="A bit of context"/>
            <Screen>
              <SectionTitle>Has anything shifted recently?</SectionTitle>
              <BodyText>Have any of these significantly impacted where you are right now? This won&apos;t change your scores — it helps us understand your context.</BodyText>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
                {lifeEvents.map(ev=>{
                  const on = form.lifeEvents.includes(ev);
                  return (
                    <div key={ev} onClick={()=>toggleEvent(ev)} style={{
                      display:"flex",alignItems:"center",gap:10,
                      padding:"11px 13px",borderRadius:10,cursor:"pointer",
                      border:`1.5px solid ${on?C.red:C.border}`,
                      background:on?C.redLight:C.white,
                      transition:"all 0.15s",userSelect:"none",
                    }}>
                      <div style={{
                        width:18,height:18,borderRadius:4,flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:on?C.red:"transparent",
                        border:`1.5px solid ${on?C.red:C.border}`,
                        transition:"all 0.15s",
                      }}>
                        {on && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{fontSize:13,color:C.ink,lineHeight:1.3}}>{ev}</span>
                    </div>
                  );
                })}
              </div>
              <PrimaryBtn onClick={()=>setStep(5)} disabled={!can4}>Continue</PrimaryBtn>
              {!isMobile && <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.inkLight,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
                Press Enter ↵ to continue
              </div>}
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 5: SEASON SELF-CONFIRM ─────────────────────────── */}
        {step===5 && (
          <>
            <TopBar onBack={()=>setStep(4)} label="Section 1 of 3"/>
            <Screen>
              <SectionTitle>Which of these sounds most like where you are right now?</SectionTitle>
              <BodyText>Pick the one that fits best — not the one you&apos;re aiming for.</BodyText>
              {selfConfirmOptions.map((opt,i)=>{
                const on = form.selfSeason===opt.season;
                return (
                  <div key={opt.id} onClick={()=>setForm(f=>({...f,selfSeason:opt.season}))}
                    style={{
                      display:"flex",gap:14,alignItems:"flex-start",
                      padding:"15px 17px",marginBottom:9,borderRadius:11,cursor:"pointer",
                      border:`1.5px solid ${on?C.red:C.border}`,
                      borderLeft:`${on?3:1.5}px solid ${on?C.red:C.border}`,
                      background:on?C.redLight:C.white,
                      transition:"all 0.15s",userSelect:"none",
                    }}>
                    <span style={{fontSize:15,lineHeight:1.6,color:C.ink}}>{opt.text}</span>
                    {!isMobile && <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:12,
                      color:C.inkLight,flexShrink:0}}>{i+1}</span>}
                  </div>
                );
              })}
              <div style={{marginTop:18}}>
                <PrimaryBtn onClick={()=>{setScIndex(0);setStep(6);}} disabled={!can5}>
                  Start the Assessment
                </PrimaryBtn>
              </div>
              {!isMobile && <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.inkLight,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
                Press 1–4 to select · Enter ↵ to continue
              </div>}
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 6: SEASON CONFIRMATION QUESTIONS ─────────────────── */}
        {step===6 && scQuestions[scIndex] && (
          <div className="fu" key={`sc-${scIndex}`}
            style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"14px 20px 0",marginBottom:28,
            }}>
              <BackArrow onClick={()=>{ if(scIndex===0) setStep(5); else setScIndex(i=>i-1); }}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,
                letterSpacing:"0.1em",textTransform:"uppercase",color:C.sage}}>
                {getCurrentQNumber()} of {totalDisplayedQ}
              </span>
              <div style={{width:36}}/>
            </div>

            <div style={{flex:1,padding:"0 22px 32px",
              display:"flex",flexDirection:"column",maxWidth:600,width:"100%",margin:"0 auto"}}>
              <div style={{minHeight:140,display:"flex",alignItems:"flex-start"}}>
                <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
                  fontSize:"clamp(21px,4vw,28px)",fontWeight:600,lineHeight:1.35,
                  color:C.ink}}>
                  {scQuestions[scIndex].text}
                </h2>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {likertLabels.map((label,i)=>{
                  const on = answers[scQuestions[scIndex].id]===i+1;
                  return (
                    <div key={i} onClick={()=>handleAnswer(scQuestions[scIndex].id,i+1)} style={{
                      display:"flex",alignItems:"center",gap:13,
                      padding:"13px 16px",borderRadius:9,cursor:"pointer",
                      border:`1.5px solid ${on?C.red:C.border}`,
                      borderLeft:`${on?3:1.5}px solid ${on?C.red:C.border}`,
                      background:on?C.redLight:C.white,
                      transition:"all 0.12s",userSelect:"none",
                      touchAction:"manipulation",
                    }}>
                      <div style={{
                        width:20,height:20,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:on?C.red:"transparent",
                        border:`2px solid ${on?C.red:C.border}`,
                        transition:"all 0.12s",
                      }}>
                        {on && <div style={{width:8,height:8,borderRadius:"50%",background:"white"}}/>}
                      </div>
                      <span style={{fontSize:15,color:C.ink}}>{label}</span>
                      {!isMobile && <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",
                        fontSize:12,color:C.inkLight}}>{i+1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <PoweredBy/>
          </div>
        )}

        {/* ── 7: EXPERTISE + PASSION QUESTIONS ─────────────────── */}
        {step===7 && q && (
          <div className="fu" key={`q-${qIndex}`}
            style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"14px 20px 0",marginBottom:28,
            }}>
              <BackArrow onClick={()=>{ if(qIndex===0) { setScIndex(scQuestions.length-1); setStep(6); } else setQIndex(i=>i-1); }}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,
                letterSpacing:"0.1em",textTransform:"uppercase",color:C.sage}}>
                {getCurrentQNumber()} of {totalDisplayedQ}
              </span>
              <div style={{width:36}}/>
            </div>

            <div style={{flex:1,padding:"0 22px 32px",
              display:"flex",flexDirection:"column",maxWidth:600,width:"100%",margin:"0 auto"}}>
              <div style={{minHeight:140,display:"flex",alignItems:"flex-start"}}>
                <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
                  fontSize:"clamp(21px,4vw,28px)",fontWeight:600,lineHeight:1.35,
                  color:C.ink}}>
                  {q.text}
                </h2>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {likertLabels.map((label,i)=>{
                  const on = answers[q.id]===i+1;
                  return (
                    <div key={i} onClick={()=>handleAnswer(q.id,i+1)} style={{
                      display:"flex",alignItems:"center",gap:13,
                      padding:"13px 16px",borderRadius:9,cursor:"pointer",
                      border:`1.5px solid ${on?C.red:C.border}`,
                      borderLeft:`${on?3:1.5}px solid ${on?C.red:C.border}`,
                      background:on?C.redLight:C.white,
                      transition:"all 0.12s",userSelect:"none",
                      touchAction:"manipulation",
                    }}>
                      <div style={{
                        width:20,height:20,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:on?C.red:"transparent",
                        border:`2px solid ${on?C.red:C.border}`,
                        transition:"all 0.12s",
                      }}>
                        {on && <div style={{width:8,height:8,borderRadius:"50%",background:"white"}}/>}
                      </div>
                      <span style={{fontSize:15,color:C.ink}}>{label}</span>
                      {!isMobile && <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",
                        fontSize:12,color:C.inkLight}}>{i+1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <PoweredBy/>
          </div>
        )}

        {/* ── 8: PROCESSING ──────────────────────────────────── */}
        {step===8 && (
          <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",textAlign:"center",padding:"48px 24px"}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:C.red,
              margin:"0 auto 26px",animation:"pulse 1.4s ease-in-out infinite"}}/>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.ink,marginBottom:8}}>
              Putting your results together<span style={{color:C.red}}>.</span>
            </h3>
            <p style={{fontSize:15,color:C.inkMid}}>This takes just a moment.</p>
          </div>
        )}

        {/* ── 9: RESULTS ─────────────────────────────────────── */}
        {step===9 && result && (
          <ResultsDisplay
            behavioral={result.behavioral}
            profile={result.profile}
            gap={result.gap}
            mismatch={result.mismatch}
            showShare={true}
            showStartOver={true}
            onStartOver={()=>{
              setStep(0);
              setForm({name:"",email:"",dobMonth:"",dobDay:"",dobYear:"",gender:"",vocation:"",relationship:"",lifeEvents:[],selfSeason:null});
              setAnswers({});
              setQIndex(0);
              setScIndex(0);
              setResult(null);
              setAssessmentId(null);
              setSaveFailed(false);
              setWelcomeName(null);
              setLookingUp(false);
            }}
            animated={true}
            isAuthenticated={authed}
            saveFailed={saveFailed}
            userName={form.name}
            userEmail={form.email}
            userGender={form.gender}
            seasonConfidence={result.seasonConfidence}
            confidenceNarrative={getConfidenceNarrative(result.behavioral, result.seasonConfidence)}
            divergenceNarrative={getDivergenceNarrative(result.eStage, result.pStage, result.lifeEventCount)}
            lifeEventsNarrative={getLifeEventsNarrative(result.lifeEventCount)}
            assessmentId={assessmentId}
          />
        )}

      </div>
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#F0EDE8"}}/>}>
      <AppInner/>
    </Suspense>
  );
}
