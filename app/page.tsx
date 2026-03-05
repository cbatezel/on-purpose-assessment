"use client";
import { useState, useEffect, useCallback, ReactNode, ChangeEvent } from "react";

// ── TYPES ───────────────────────────────────────────────────────
type Season = "Identity" | "Exploration" | "Influence" | "Multiplication";
type Alignment = "Behind" | "Aligned" | "Ahead";
type ProfileKey = `${Season}_${Alignment}`;
type SectionKey = "season" | "expertise" | "passion";

interface ResultData {
  profile: { name: string; mirrorLine: string; description: string; question: string };
  behavioral: Season;
  eStage: string;
  pStage: string;
  gap: string | null;
  mismatch: string | null;
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

const genderOptions       = ["Male","Female","Non-binary","Prefer not to say"];
const relationshipOptions = ["Single","Married","Partnered","Divorced","Widowed","Prefer not to say"];

// ── QUESTIONS ──────────────────────────────────────────────────
const questions = {
  season: [
    {id:"s1",text:"I have a clear sense of what I believe and what I'm willing to stand behind.",season:"Identity"},
    {id:"s2",text:"I'm more focused on getting broad experience right now than finding my lane.",season:"Exploration"},
    {id:"s3",text:"I know what I'm best at, and I'm actively going deeper on it.",season:"Influence"},
    {id:"s4",text:"I get more energy from helping others step into their potential than doing the work myself.",season:"Multiplication"},
    {id:"s5",text:"I'm still working out what kind of person I want to be.",season:"Identity",inverse:true},
    {id:"s6",text:"I say yes to most opportunities because I'm still figuring out where I add the most value.",season:"Exploration"},
    {id:"s7",text:"I've earned the right to say no — and I'm using it.",season:"Influence"},
    {id:"s8",text:"My biggest contribution right now is probably through someone else, not my own output.",season:"Multiplication"},
  ],
  expertise: [
    {id:"e1",text:"I regularly invest time improving my craft, even when no one is asking me to.",stage:"Influence"},
    {id:"e2",text:"I can name the specific thing I'm known for doing well.",stage:"Influence"},
    {id:"e3",text:"I'm more interested in getting reps than getting recognition right now.",stage:"Exploration"},
    {id:"e4",text:"I find more energy in teaching others what I know than in doing it myself.",stage:"Multiplication"},
    {id:"e5",text:"I deliberately practice the fundamentals of my work, even when I already feel competent.",stage:"Influence"},
    {id:"e6",text:"I say no to opportunities outside my area of focus so I can go deeper on what's inside it.",stage:"Influence"},
    {id:"e7",text:"The people around me would say they know exactly what I bring.",stage:"Influence"},
    {id:"e8",text:"I'm still figuring out what kind of work I'm actually good at.",stage:"Identity",inverse:true},
    {id:"e9",text:"I'm satisfied with the level of expertise I've developed and don't feel much need to keep growing.",stage:"BS",bs:true},
  ],
  passion: [
    {id:"p1",text:"I can name a specific person or group whose situation I feel responsible to help.",stage:"Influence"},
    {id:"p2",text:"I notice problems in the world that bother me more than they seem to bother others.",stage:"Identity"},
    {id:"p3",text:"I've recently given time, money, or energy to something that didn't benefit me directly.",stage:"Exploration"},
    {id:"p4",text:"My passion and my daily work feel meaningfully connected.",stage:"Influence"},
    {id:"p5",text:"I've named what I won't carry so I can go deeper on what I will.",stage:"Influence"},
    {id:"p6",text:"I'm more energized by helping others pursue their mission than building my own.",stage:"Multiplication"},
    {id:"p7",text:"I'm still figuring out what I'm actually willing to fight for.",stage:"Identity",inverse:true},
    {id:"p8",text:"The cause or people I care about would say I show up for them consistently and without reservation.",stage:"BS",bs:true},
  ],
};

// ── SCORING ────────────────────────────────────────────────────
const seasonOrder: Record<string, number> = {Identity:0,Exploration:1,Influence:2,Multiplication:3};

function computeSeasonScore(ans: Record<string, number>) {
  const s: Record<string, number> = {Identity:0,Exploration:0,Influence:0,Multiplication:0};
  questions.season.forEach(q=>{const v=ans[q.id]||3; s[q.season]+=q.inverse?6-v:v;});
  return Object.entries(s).sort((a,b)=>b[1]-a[1])[0][0];
}
function computeStage(section: SectionKey, ans: Record<string, number>) {
  const s: Record<string, number> = {Identity:0,Exploration:0,Influence:0,Multiplication:0};
  (questions[section] as Array<{id: string; text: string; stage?: string; inverse?: boolean; bs?: boolean}>).filter(q=>!q.bs).forEach(q=>{
    if (!q.stage||q.stage==="BS") return;
    const v = q.inverse?6-(ans[q.id]||3):(ans[q.id]||3);
    s[q.stage]=(s[q.stage]||0)+v;
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

function SecondaryBtn({children,onClick}: {children: ReactNode; onClick?: () => void}) {
  return (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:"100%",height:42,borderRadius:9,
      border:`1.5px solid ${C.red}`,background:"transparent",
      fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
      color:C.red,cursor:"pointer",transition:"background 0.15s",
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

function Divider() {
  return <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"28px 0"}}/>;
}

function PoweredBy() {
  return (
    <div style={{textAlign:"center",padding:"30px 0 4px",fontSize:11,
      fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
      textTransform:"uppercase",color:C.inkLight}}>
      Powered by Third Space
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
export default function App() {
  // step: 0=landing 1=name/email 2=disclaimer 3=context 4=life events 5=season 6=questions 7=processing 8=results
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<{
    firstName: string; lastName: string; email: string;
    dobMonth: string; dobDay: string; dobYear: string;
    gender: string; vocation: string; relationship: string;
    lifeEvents: string[]; selfSeason: string | null;
  }>({
    firstName:"", lastName:"", email:"",
    dobMonth:"", dobDay:"", dobYear:"",
    gender:"", vocation:"", relationship:"",
    lifeEvents:[], selfSeason:null,
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [qIndex,  setQIndex]  = useState(0);
  const [result,  setResult]  = useState<ResultData | null>(null);
  const [copied,  setCopied]  = useState(false);
  // Track whether auto-advance is locked (prevents double-fire)
  const [advancing, setAdvancing] = useState(false);

  const allQ = [
    ...questions.season.map(q=>({...q,section:"season" as const})),
    ...questions.expertise.map(q=>({...q,section:"expertise" as const})),
    ...questions.passion.map(q=>({...q,section:"passion" as const})),
  ];
  const totalQ = allQ.length;
  const q = allQ[qIndex];

  // Scroll to top on step/question change
  useEffect(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },[step,qIndex]);

  // Compute results when entering processing screen
  useEffect(()=>{
    if (step!==7) return;
    const behavioral = computeSeasonScore(answers);
    const eStage     = computeStage("expertise",answers);
    const pStage     = computeStage("passion",answers);
    const profile    = getProfile(behavioral,eStage,pStage);
    const gap        = getGapLanguage(eStage,pStage,behavioral);
    const mismatch   = getMismatchLanguage(form.selfSeason,behavioral);
    setResult({profile,behavioral: behavioral as Season,eStage,pStage,gap,mismatch});
    const t = setTimeout(()=>setStep(8),2600);
    return ()=>clearTimeout(t);
  },[step]); // eslint-disable-line

  // Validation (hoisted above effects that need them)
  const can1 = form.firstName.trim() && form.lastName.trim() && form.email.includes("@");
  const can3 = form.dobMonth && form.dobDay && form.dobYear;
  const can4 = form.lifeEvents.length > 0;
  const can5 = !!form.selfSeason;

  // Auto-advance after answer selection — debounced, locked to prevent double-fire
  const handleAnswer = useCallback((id: string, val: number) => {
    if (advancing) return;
    setAdvancing(true);
    setAnswers(prev=>({...prev,[id]:val}));
    setTimeout(()=>{
      setAdvancing(false);
      if (qIndex < totalQ-1) setQIndex(i=>i+1);
      else setStep(7);
    }, 400);
  },[advancing, qIndex, totalQ]);

  // Keyboard support for question screens
  useEffect(()=>{
    if (step!==6 || !q) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key>="1" && e.key<="5") { handleAnswer(q.id, Number(e.key)); return; }
      if (e.key==="Enter" && answers[q.id]) { handleAnswer(q.id, answers[q.id]); return; }
      if (e.key==="ArrowLeft") { if(qIndex===0) setStep(5); else setQIndex(i=>i-1); return; }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  },[step, q, qIndex, handleAnswer, answers]);

  // Enter key support for pre-assessment screens
  useEffect(()=>{
    if (step<1 || step>5) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key!=="Enter") return;
      // Don't trigger if user is in an input/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag==="SELECT") return;
      if (step===1 && can1) setStep(2);
      else if (step===2) setStep(3);
      else if (step===3 && can3) setStep(4);
      else if (step===4 && can4) setStep(5);
      else if (step===5 && can5) { setQIndex(0); setStep(6); }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  },[step, can1, can3, can4, can5]);

  const toggleEvent = (ev: string) => {
    if (ev==="None of these"){ setForm(f=>({...f,lifeEvents:["None of these"]})); return; }
    setForm(f=>{
      const flt = f.lifeEvents.filter(e=>e!=="None of these");
      return {...f, lifeEvents: flt.includes(ev) ? flt.filter(e=>e!==ev) : [...flt,ev]};
    });
  };

  const handleShare = async(platform: string) => {
    const text = `I just took the On Purpose Assessment and got "${result?.profile?.name}". Find out where you are: `;
    const url  = window.location.href;
    if (platform==="copy"){
      try{await navigator.clipboard.writeText(url);}catch(_){}
      setCopied(true); setTimeout(()=>setCopied(false),2000); return;
    }
    if (platform==="x")     window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+url)}`);
    if (platform==="li")    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    if (platform==="email") window.open(`mailto:?subject=On Purpose Assessment&body=${encodeURIComponent(text+url)}`);
  };

  // Progress bar value
  const progress =
    step===0?0 : step===1?5 : step===2?9 : step===3?14 : step===4?18 : step===5?22 :
    step===6 ? 22+Math.round((qIndex/totalQ)*70) : step===7?95 : 100;

  const days = getDays(form.dobMonth, form.dobYear);

  // Gap between stacked fields inside a card
  const fieldGap = {marginBottom:18};

  return (
    <>
      <style>{globalCss}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>

        {/* Single progress bar */}
        {step>0 && step<8 && (
          <div style={{position:"fixed",top:0,left:0,right:0,height:3,background:C.border,zIndex:100}}>
            <div style={{height:"100%",background:C.red,width:`${progress}%`,
              transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"}}/>
          </div>
        )}

        {/* ── 0: LANDING ─────────────────────────────────────── */}
        {step===0 && (
          <div className="fu" style={{minHeight:"100vh",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",
            textAlign:"center",padding:"48px 28px",maxWidth:480,margin:"0 auto"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.12em",
              textTransform:"uppercase",color:C.sage,marginBottom:20}}>
              The On Purpose Assessment
            </div>
            <div style={{position:"relative",width:"100%",display:"flex",justifyContent:"center"}}>
              <DotCloud/>
              <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",
                fontSize:"clamp(30px,7vw,46px)",fontWeight:700,lineHeight:1.15,
                color:C.ink,marginBottom:18}}>
                Most people feel behind.<br/>
                This will help you figure out why<span style={{color:C.red}}>.</span>
              </h1>
            </div>
            <p style={{fontSize:16,lineHeight:1.65,color:C.inkMid,marginBottom:36,maxWidth:340}}>
              A short diagnostic for your clarity and engagement with purpose.
            </p>
            <button onClick={()=>setStep(1)} style={{
              display:"flex",alignItems:"center",justifyContent:"center",
              width:"100%",maxWidth:260,height:50,borderRadius:10,border:"none",
              fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,
              background:C.red,color:"white",cursor:"pointer",letterSpacing:"0.01em",
            }}>Get Started</button>
            <p style={{marginTop:24,fontSize:12,color:C.inkLight}}>
              Based on{" "}
              <a href="https://www.amazon.com/Purpose-Beau-Johnson/dp/B0FRMXCDWS" target="_blank" rel="noopener noreferrer"
                style={{color:C.red,textDecoration:"none"}}>
                <em>On Purpose</em> by Beau Johnson
              </a>
            </p>
            <PoweredBy/>
          </div>
        )}

        {/* ── 1: NAME + EMAIL ────────────────────────────────── */}
        {step===1 && (
          <>
            <TopBar onBack={()=>setStep(0)} label="Let's get started"/>
            <Screen>
              <SectionTitle>First, a little about you.</SectionTitle>
              <BodyText>Your results will be sent to your inbox.</BodyText>
              <Card>
                <div style={fieldGap}>
                  <TextInput label="First name" value={form.firstName} placeholder="First name"
                    autoComplete="given-name"
                    onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,firstName:e.target.value}))}/>
                </div>
                <div style={fieldGap}>
                  <TextInput label="Last name" value={form.lastName} placeholder="Last name"
                    autoComplete="family-name"
                    onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,lastName:e.target.value}))}/>
                </div>
                <TextInput label="Email address" value={form.email} type="email"
                  placeholder="your@email.com" autoComplete="email" inputMode="email"
                  onChange={(e: ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,email:e.target.value}))}/>
              </Card>
              <PrimaryBtn onClick={()=>setStep(2)} disabled={!can1}>Continue</PrimaryBtn>
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 2: DISCLAIMER ──────────────────────────────────── */}
        {step===2 && (
          <>
            <TopBar onBack={()=>setStep(1)} label="Before you begin"/>
            <Screen>
              <SectionTitle>This is a tool, not a verdict.</SectionTitle>
              <Card>
                <p style={{fontSize:15,lineHeight:1.72,color:C.inkMid,marginBottom:16}}>
                  Purpose is personal, and no set of questions can fully capture where someone is or where they're headed. What this can do is surface patterns — the kind that are easier to see when someone else names them.
                </p>
                <p style={{fontSize:15,lineHeight:1.72,color:C.inkMid,marginBottom:16}}>
                  Answer based on where you are right now, not where you've been or where you're hoping to go. There are no impressive answers here.
                </p>
                <p style={{fontSize:15,lineHeight:1.72,color:C.inkMid}}>
                  The goal isn't to put you in a box. It's to hand you a better mirror.
                </p>
              </Card>
              <PrimaryBtn onClick={()=>setStep(3)}>Got it, let's go</PrimaryBtn>
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 3: PERSONAL CONTEXT ────────────────────────────── */}
        {step===3 && (
          <>
            <TopBar onBack={()=>setStep(2)} label="A bit of context"/>
            <Screen>
              <SectionTitle>Tell us a little more about where you are.</SectionTitle>
              <BodyText>This helps us personalize your results. It won't change your scores.</BodyText>
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
              <PrimaryBtn onClick={()=>setStep(4)} disabled={!can3}>Continue</PrimaryBtn>
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 4: LIFE EVENTS ─────────────────────────────────── */}
        {step===4 && (
          <>
            <TopBar onBack={()=>setStep(3)} label="A bit of context"/>
            <Screen>
              <SectionTitle>Has anything shifted recently?</SectionTitle>
              <BodyText>Check anything that applies to the last six months. This won't change your scores — it helps us understand your context.</BodyText>
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
              <BodyText>Pick the one that fits best — not the one you're aiming for.</BodyText>
              {selfConfirmOptions.map(opt=>{
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
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,
                      color:C.red,flexShrink:0,paddingTop:2}}>{opt.id}</span>
                    <span style={{fontSize:15,lineHeight:1.6,color:C.ink}}>{opt.text}</span>
                  </div>
                );
              })}
              <div style={{marginTop:18}}>
                <PrimaryBtn onClick={()=>{setQIndex(0);setStep(6);}} disabled={!can5}>
                  Start the Assessment
                </PrimaryBtn>
              </div>
              <PoweredBy/>
            </Screen>
          </>
        )}

        {/* ── 6: QUESTIONS ───────────────────────────────────── */}
        {step===6 && q && (
          <div className="fu" key={qIndex}
            style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
            {/* Same top-bar style as other screens — just arrow, no label */}
            <div style={{padding:"14px 20px 0",marginBottom:28}}>
              <BackArrow onClick={()=>{ if(qIndex===0) setStep(5); else setQIndex(i=>i-1); }}/>
            </div>

            {/* Question + answers */}
            <div style={{flex:1,padding:"0 22px 32px",
              display:"flex",flexDirection:"column",maxWidth:600,width:"100%",margin:"0 auto"}}>
              {/* Fixed-height question area so answers stay at the same position */}
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
                      <span style={{marginLeft:"auto",fontFamily:"'DM Mono',monospace",
                        fontSize:12,color:C.inkLight}}>{i+1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <PoweredBy/>
          </div>
        )}

        {/* ── 7: PROCESSING ──────────────────────────────────── */}
        {step===7 && (
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

        {/* ── 8: RESULTS ─────────────────────────────────────── */}
        {step===8 && result && (
          <div style={{maxWidth:620,margin:"0 auto",padding:"64px 24px 72px"}}>

            <div className="fu" style={{fontFamily:"'DM Mono',monospace",fontSize:11,
              letterSpacing:"0.12em",textTransform:"uppercase",color:C.sage,
              marginBottom:12,animationDelay:"0.1s"}}>
              Your On Purpose Snapshot
            </div>

            <h1 className="fu" style={{fontFamily:"'Playfair Display',Georgia,serif",
              fontSize:"clamp(34px,7vw,50px)",fontWeight:700,color:C.ink,
              marginBottom:12,lineHeight:1.1,animationDelay:"0.2s"}}>
              {result.profile.name}
              <span style={{display:"inline-block",width:9,height:9,borderRadius:"50%",
                background:C.red,marginLeft:4,verticalAlign:"middle",marginBottom:5}}/>
            </h1>

            <p className="fu" style={{fontFamily:"'Playfair Display',Georgia,serif",
              fontSize:18,fontStyle:"italic",color:C.inkMid,lineHeight:1.55,
              marginBottom:34,animationDelay:"0.3s"}}>
              &ldquo;{result.profile.mirrorLine}&rdquo;
            </p>

            <Divider/>

            {/* Your Season */}
            <div style={{animation:"fadeUp 0.5s ease-out 0.35s both"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.08em",
                textTransform:"uppercase",color:C.sage,marginBottom:9}}>Your Season</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:7,
                background:C.sageLight,color:"#4A5C49",borderRadius:100,
                padding:"5px 13px",fontSize:13,fontWeight:600,marginBottom:12}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:C.sage}}/>
                {result.behavioral}
              </div>
              <p style={{fontSize:16,lineHeight:1.75,color:C.ink}}>{seasonDescriptions[result.behavioral]}</p>
              {result.mismatch && (
                <div style={{background:C.redLight,borderLeft:`3px solid ${C.red}`,
                  borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
                  fontSize:14,lineHeight:1.65,color:C.inkMid}}>{result.mismatch}</div>
              )}
            </div>

            <Divider/>

            {/* Where the Tension Is */}
            <div style={{animation:"fadeUp 0.5s ease-out 0.5s both"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.08em",
                textTransform:"uppercase",color:C.sage,marginBottom:9}}>Where the Tension Is</div>
              <p style={{fontSize:16,lineHeight:1.75,color:C.ink}}>{result.profile.description}</p>
              {result.gap && (
                <div style={{background:C.sageLight,borderLeft:`3px solid ${C.sage}`,
                  borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
                  fontSize:14,lineHeight:1.65,color:C.inkMid}}>{result.gap}</div>
              )}
            </div>

            <Divider/>

            {/* Question */}
            <div style={{animation:"fadeUp 0.5s ease-out 0.65s both",
              textAlign:"center",padding:"32px 22px",background:C.white,
              borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.1em",
                textTransform:"uppercase",color:C.sage,marginBottom:13}}>
                A question worth sitting with
              </div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",
                fontSize:"clamp(18px,3vw,22px)",fontWeight:600,lineHeight:1.4,color:C.ink}}>
                &ldquo;{result.profile.question}&rdquo;
              </div>
            </div>

            <Divider/>

            {/* What's Next — vertically stacked */}
            <div style={{animation:"fadeUp 0.5s ease-out 0.8s both"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.08em",
                textTransform:"uppercase",color:C.sage,marginBottom:9}}>What&apos;s Next</div>
              <p style={{fontSize:16,lineHeight:1.75,color:C.ink,marginBottom:16}}>
                The On Purpose Assessment is a starting point. If something in your results landed — or if something felt unresolved — there are a few ways to keep going.
              </p>
              {/* Stacked vertically as requested */}
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
                {[
                  {label:"Cohort",title:"Purpose Cohort",    body:"Work through purpose in a small group with others in a similar season. Built for people ready to go deeper together."},
                  {label:"Retreat",title:"Purpose Retreat",  body:"A focused experience for people ready to go deep on what's next. Two days. Small group. Real clarity."},
                ].map(cta=>(
                  <div key={cta.label} style={{background:C.white,border:`1px solid ${C.border}`,
                    borderRadius:12,padding:22}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                      textTransform:"uppercase",color:C.red,marginBottom:6}}>{cta.label}</div>
                    <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,
                      fontWeight:600,color:C.ink,marginBottom:8}}>{cta.title}</div>
                    <p style={{fontSize:14,lineHeight:1.6,color:C.inkMid,marginBottom:16}}>{cta.body}</p>
                    <SecondaryBtn>Learn More &rarr;</SecondaryBtn>
                  </div>
                ))}
              </div>
              <p style={{textAlign:"center",fontSize:12,color:C.inkLight}}>
                Not sure which is right for you?{" "}
                <a href="mailto:hello@onpurpose.com" style={{color:C.red,textDecoration:"none"}}>
                  Send us a message.
                </a>
              </p>
            </div>

            <Divider/>

            {/* Share */}
            <div style={{textAlign:"center",paddingTop:24,animation:"fadeUp 0.5s ease-out 0.95s both"}}>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,
                fontWeight:600,color:C.ink,marginBottom:7}}>
                Share your snapshot<span style={{color:C.red}}>.</span>
              </div>
              <p style={{fontSize:14,color:C.inkMid,marginBottom:18,lineHeight:1.6}}>
                Send this to someone who knows you well. See if they agree.
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {[
                  {id:"copy",  label:copied?"✓ Copied":"Copy link"},
                  {id:"x",    label:"Share on X"},
                  {id:"li",   label:"Share on LinkedIn"},
                  {id:"email",label:"Email a friend"},
                ].map(s=>(
                  <button key={s.id} onClick={()=>handleShare(s.id)} style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    padding:"9px 15px",border:`1.5px solid ${C.border}`,
                    borderRadius:100,fontFamily:"'DM Sans',sans-serif",
                    fontSize:13,fontWeight:500,color:C.ink,
                    cursor:"pointer",background:C.white,transition:"all 0.15s",
                  }}>{s.label}</button>
                ))}
              </div>
              <p style={{fontSize:12,color:C.inkLight,marginTop:18,lineHeight:1.55}}>
                Your full results are on their way to {form.email}.<br/>
                Check your inbox in the next few minutes.
              </p>
            </div>

            <Divider/>

            <div style={{textAlign:"center"}}>
              <button onClick={()=>{
                setStep(0);
                setForm({firstName:"",lastName:"",email:"",dobMonth:"",dobDay:"",dobYear:"",gender:"",vocation:"",relationship:"",lifeEvents:[],selfSeason:null});
                setAnswers({});
                setQIndex(0);
                setResult(null);
              }} style={{
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                padding:"10px 24px",border:`1.5px solid ${C.border}`,
                borderRadius:10,fontFamily:"'DM Sans',sans-serif",
                fontSize:14,fontWeight:500,color:C.inkMid,
                cursor:"pointer",background:C.white,transition:"all 0.15s",
              }}>Start Over</button>
            </div>

            <PoweredBy/>
          </div>
        )}

      </div>
    </>
  );
}
