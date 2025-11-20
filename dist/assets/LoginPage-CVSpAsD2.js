import{r as p,b as Y,u as J,d as V,l as E,j as s,L}from"./main-DuZ82yZp.js";import{B as X}from"./button-Bb_PT1Zw.js";import{I as T}from"./input-CNTeUzfK.js";import{L as _}from"./label-CSZx0yin.js";import{A as ee,a as te}from"./alert-C0ucke8C.js";import{u as ae,a as se}from"./useMediaQuery-C7XNGOS1.js";import{m as j}from"./proxy-CHWBjvZ-.js";import{B as re}from"./book-open-eUF-sl3F.js";import{C as oe}from"./circle-alert-Cj7Ec-TF.js";import{M as ie}from"./mail-CGGWbxmG.js";import{L as ne}from"./lock-Cq8bVx4u.js";import{E as le}from"./eye-off-C457CDYt.js";import{E as de}from"./eye-_NQjWQ1g.js";import{A as ce}from"./arrow-right-CvFRrHIb.js";import{S as me}from"./sparkles-Cm3KW2On.js";import{U as pe}from"./users-BE0uReGI.js";import{C as ue}from"./chart-column-sFA7nJXK.js";let fe={data:""},xe=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||fe},ge=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,he=/\/\*[^]*?\*\/|  +/g,D=/\n+/g,w=(e,t)=>{let a="",o="",l="";for(let i in e){let r=e[i];i[0]=="@"?i[1]=="i"?a=i+" "+r+";":o+=i[1]=="f"?w(r,i):i+"{"+w(r,i[1]=="k"?"":t)+"}":typeof r=="object"?o+=w(r,t?t.replace(/([^,])+/g,n=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,n):n?n+" "+d:d)):i):r!=null&&(i=/^--/.test(i)?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=w.p?w.p(i,r):i+":"+r+";")}return a+(t&&l?t+"{"+l+"}":l)+o},v={},M=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+M(e[a]);return t}return e},be=(e,t,a,o,l)=>{let i=M(e),r=v[i]||(v[i]=(d=>{let c=0,m=11;for(;c<d.length;)m=101*m+d.charCodeAt(c++)>>>0;return"go"+m})(i));if(!v[r]){let d=i!==e?e:(c=>{let m,h,g=[{}];for(;m=ge.exec(c.replace(he,""));)m[4]?g.shift():m[3]?(h=m[3].replace(D," ").trim(),g.unshift(g[0][h]=g[0][h]||{})):g[0][m[1]]=m[2].replace(D," ").trim();return g[0]})(e);v[r]=w(l?{["@keyframes "+r]:d}:d,a?"":"."+r)}let n=a&&v.g?v.g:null;return a&&(v.g=v[r]),((d,c,m,h)=>{h?c.data=c.data.replace(h,d):c.data.indexOf(d)===-1&&(c.data=m?d+c.data:c.data+d)})(v[r],t,o,n),r},ve=(e,t,a)=>e.reduce((o,l,i)=>{let r=t[i];if(r&&r.call){let n=r(a),d=n&&n.props&&n.props.className||/^go/.test(n)&&n;r=d?"."+d:n&&typeof n=="object"?n.props?"":w(n,""):n===!1?"":n}return o+l+(r??"")},"");function P(e){let t=this||{},a=e.call?e(t.p):e;return be(a.unshift?a.raw?ve(a,[].slice.call(arguments,1),t.p):a.reduce((o,l)=>Object.assign(o,l&&l.call?l(t.p):l),{}):a,xe(t.target),t.g,t.o,t.k)}let R,z,C;P.bind({g:1});let y=P.bind({k:1});function ye(e,t,a,o){w.p=t,R=e,z=a,C=o}function N(e,t){let a=this||{};return function(){let o=arguments;function l(i,r){let n=Object.assign({},i),d=n.className||l.className;a.p=Object.assign({theme:z&&z()},n),a.o=/ *go\d+/.test(d),n.className=P.apply(a,o)+(d?" "+d:"");let c=e;return e[0]&&(c=n.as||e,delete n.as),C&&c[0]&&C(n),R(c,n)}return l}}var je=e=>typeof e=="function",I=(e,t)=>je(e)?e(t):e,we=(()=>{let e=0;return()=>(++e).toString()})(),Ne=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ke=20,q="default",B=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:o}=t;return B(e,{type:e.toasts.find(r=>r.id===o.id)?1:0,toast:o});case 3:let{toastId:l}=t;return{...e,toasts:e.toasts.map(r=>r.id===l||l===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+i}))}}},Ee=[],Ae={toasts:[],pausedAt:void 0,settings:{toastLimit:ke}},A={},U=(e,t=q)=>{A[t]=B(A[t]||Ae,e),Ee.forEach(([a,o])=>{a===t&&o(A[t])})},H=e=>Object.keys(A).forEach(t=>U(e,t)),Le=e=>Object.keys(A).find(t=>A[t].toasts.some(a=>a.id===e)),S=(e=q)=>t=>{U(t,e)},$e=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||we()}),$=e=>(t,a)=>{let o=$e(t,e,a);return S(o.toasterId||Le(o.id))({type:2,toast:o}),o.id},u=(e,t)=>$("blank")(e,t);u.error=$("error");u.success=$("success");u.loading=$("loading");u.custom=$("custom");u.dismiss=(e,t)=>{let a={type:3,toastId:e};t?S(t)(a):H(a)};u.dismissAll=e=>u.dismiss(void 0,e);u.remove=(e,t)=>{let a={type:4,toastId:e};t?S(t)(a):H(a)};u.removeAll=e=>u.remove(void 0,e);u.promise=(e,t,a)=>{let o=u.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(l=>{let i=t.success?I(t.success,l):void 0;return i?u.success(i,{id:o,...a,...a?.success}):u.dismiss(o),l}).catch(l=>{let i=t.error?I(t.error,l):void 0;i?u.error(i,{id:o,...a,...a?.error}):u.dismiss(o)}),e};var Pe=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,ze=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ce=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ie=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Pe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ze} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Ce} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Se=y`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Fe=N("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Se} 1s linear infinite;
`,Oe=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Te=y`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,_e=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Oe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Te} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,De=N("div")`
  position: absolute;
`,Me=N("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Re=y`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,qe=N("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Re} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Be=({toast:e})=>{let{icon:t,type:a,iconTheme:o}=e;return t!==void 0?typeof t=="string"?p.createElement(qe,null,t):t:a==="blank"?null:p.createElement(Me,null,p.createElement(Fe,{...o}),a!=="loading"&&p.createElement(De,null,a==="error"?p.createElement(Ie,{...o}):p.createElement(_e,{...o})))},Ue=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,He=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ke="0%{opacity:0;} 100%{opacity:1;}",Ze="0%{opacity:1;} 100%{opacity:0;}",Ge=N("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Qe=N("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,We=(e,t)=>{let a=e.includes("top")?1:-1,[o,l]=Ne()?[Ke,Ze]:[Ue(a),He(a)];return{animation:t?`${y(o)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(l)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};p.memo(({toast:e,position:t,style:a,children:o})=>{let l=e.height?We(e.position||t||"top-center",e.visible):{opacity:0},i=p.createElement(Be,{toast:e}),r=p.createElement(Qe,{...e.ariaProps},I(e.message,e));return p.createElement(Ge,{className:e.className,style:{...l,...a,...e.style}},typeof o=="function"?o({icon:i,message:r}):p.createElement(p.Fragment,null,i,r))});ye(p.createElement);P`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;var Ye=u;const ft=()=>{const[e,t]=p.useState({email:"",password:""}),[a,o]=p.useState(!1),[l,i]=p.useState(!1),[r,n]=p.useState(""),{signIn:d,user:c,profile:m,loading:h}=Y(),g=J(),F=V(),K=ae(),Z=se(),f=K||Z;p.useEffect(()=>{if(console.log("[LoginPage] Auth state:",{hasUser:!!c,hasProfile:!!m,authLoading:h,profileRole:m?.role}),c&&m&&!h){E.debug("[LoginPage] ✅ All conditions met, redirecting to:",m.role);const x=m.role;x==="student"?(E.debug("[LoginPage] Navigating to /students/dashboard"),g("/students/dashboard")):x==="teacher"?(E.debug("[LoginPage] Navigating to /dashboard"),g("/dashboard")):x==="school"?(E.debug("[LoginPage] Navigating to /school"),g("/school")):(E.debug("[LoginPage] Fallback: Navigating to /dashboard"),g("/dashboard"))}},[c,m,h,g]);const O=x=>{const{name:b,value:k}=x.target;t(W=>({...W,[b]:k})),n("")},G=async x=>{if(x.preventDefault(),n(""),!e.email||!e.password){n("Por favor, preencha todos os campos");return}if(!e.email.includes("@")){n("Por favor, insira um e-mail válido");return}i(!0);try{const{data:b,error:k}=await d(e.email,e.password);if(k){k.message.includes("Invalid login credentials")?n("E-mail ou senha incorretos"):k.message.includes("Email not confirmed")?n("Por favor, confirme seu e-mail antes de fazer login"):n(k.message||"Erro ao fazer login. Tente novamente.");return}b?.user&&Ye.success("Login realizado com sucesso!")}catch(b){E.error("Login error:",b),n("Erro ao fazer login. Tente novamente.")}finally{i(!1)}},Q=[{icon:me,title:"IA Avançada",description:"Chatbot inteligente para suas turmas"},{icon:pe,title:"Gestão Fácil",description:"Organize alunos e professores"},{icon:ue,title:"Analytics",description:"Acompanhe o progresso em tempo real"}];return s.jsxs("div",{className:"min-h-screen flex",children:[s.jsx("div",{className:"flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",children:s.jsxs(j.div,{initial:f?!1:{opacity:0,x:-20},animate:f?void 0:{opacity:1,x:0},transition:f?void 0:{duration:.5},className:"w-full max-w-md",children:[s.jsxs(L,{to:"/",className:"flex items-center justify-center gap-3 mb-8",children:[s.jsx("div",{className:"w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800",children:s.jsx(re,{className:"w-7 h-7 text-white"})}),s.jsx("span",{className:"text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent",children:"TamanduAI"})]}),s.jsxs(j.div,{initial:f?!1:{opacity:0,y:10},animate:f?void 0:{opacity:1,y:0},transition:f?void 0:{delay:.1},className:"text-center mb-8",children:[s.jsx("h2",{className:"text-3xl font-bold text-foreground mb-2",children:"Bem-vindo de volta!"}),s.jsx("p",{className:"text-muted-foreground",children:"Entre para continuar gerenciando suas turmas"})]}),s.jsxs(j.form,{initial:f?!1:{opacity:0,y:20},animate:f?void 0:{opacity:1,y:0},transition:f?void 0:{delay:.2},onSubmit:G,className:"space-y-6",children:[r&&s.jsxs(ee,{variant:"destructive",className:"mb-6",children:[s.jsx(oe,{className:"w-4 h-4"}),s.jsx(te,{children:r})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsx(_,{htmlFor:"email",children:"E-mail"}),s.jsxs("div",{className:"relative",children:[s.jsx(ie,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(T,{id:"email",name:"email",type:"email",placeholder:"seu@email.com",value:e.email,onChange:O,className:"pl-10 h-12",disabled:l,autoComplete:"email",required:!0})]})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsxs("div",{className:"flex items-center justify-between",children:[s.jsx(_,{htmlFor:"password",children:"Senha"}),s.jsx(L,{to:"/forgot-password",className:"text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline",children:"Esqueceu a senha?"})]}),s.jsxs("div",{className:"relative",children:[s.jsx(ne,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(T,{id:"password",name:"password",type:a?"text":"password",placeholder:"••••••••",value:e.password,onChange:O,className:"pl-10 pr-10 h-12",disabled:l,autoComplete:"current-password",required:!0}),s.jsx("button",{type:"button",onClick:()=>o(!a),className:"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",tabIndex:-1,children:a?s.jsx(le,{className:"w-5 h-5"}):s.jsx(de,{className:"w-5 h-5"})})]})]}),s.jsx(X,{type:"submit",variant:"gradient",size:"lg",className:"w-full",disabled:l,rightIcon:s.jsx(ce,{className:"w-5 h-5"}),children:l?"Entrando...":"Entrar"}),s.jsxs("p",{className:"text-xs text-center text-slate-500 dark:text-slate-400 mt-3",children:["Ao fazer login, você concorda com nossos"," ",s.jsx(L,{to:"/terms",target:"_blank",className:"text-blue-600 dark:text-blue-400 hover:underline",children:"Termos de Uso"})," ","e"," ",s.jsx(L,{to:"/privacy",target:"_blank",className:"text-blue-600 dark:text-blue-400 hover:underline",children:"Política de Privacidade"})]})]}),s.jsxs(j.div,{initial:f?!1:{opacity:0},animate:f?void 0:{opacity:1},transition:f?void 0:{delay:.3},className:"my-8 flex items-center gap-4",children:[s.jsx("div",{className:"flex-1 h-px bg-border"}),s.jsx("span",{className:"text-sm text-muted-foreground",children:"ou"}),s.jsx("div",{className:"flex-1 h-px bg-border"})]}),s.jsxs(j.p,{initial:f?!1:{opacity:0},animate:f?void 0:{opacity:1},transition:f?void 0:{delay:.4},className:"text-center text-muted-foreground",children:["Não tem uma conta?"," ",s.jsx(L,{to:"/register",state:F.state?.redirectTo?{redirectTo:F.state.redirectTo}:void 0,className:"text-blue-600 dark:text-blue-400 font-semibold hover:underline",children:"Cadastre-se grátis"})]})]})}),s.jsxs("div",{className:"hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-cyan-700 via-blue-700 to-blue-900",children:[s.jsx("div",{className:"absolute inset-0 opacity-10",children:s.jsx("div",{className:"absolute inset-0",style:{backgroundImage:"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",backgroundSize:"40px 40px"}})}),s.jsx("div",{className:"relative z-10 flex flex-col justify-center px-12 text-white",children:s.jsxs(j.div,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3,duration:.6},children:[s.jsxs("h2",{className:"text-4xl font-bold mb-6",children:["A plataforma educacional",s.jsx("br",{}),"que professores adoram"]}),s.jsxs("p",{className:"text-xl text-white/90 mb-12",children:["Reduza 70% do tempo em tarefas administrativas e",s.jsx("br",{}),"foque no que realmente importa: ensinar."]}),s.jsx("div",{className:"space-y-6",children:Q.map((x,b)=>s.jsxs(j.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.5+b*.1},className:"flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20",children:[s.jsx("div",{className:"w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0",children:s.jsx(x.icon,{className:"w-6 h-6"})}),s.jsxs("div",{children:[s.jsx("h3",{className:"font-semibold text-lg mb-1",children:x.title}),s.jsx("p",{className:"text-white/80 text-sm",children:x.description})]})]},x.title))}),s.jsx(j.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.9},className:"mt-12 grid grid-cols-3 gap-6",children:[{value:"10K+",label:"Professores"},{value:"50K+",label:"Alunos"},{value:"99%",label:"Satisfação"}].map((x,b)=>s.jsxs("div",{className:"text-center",children:[s.jsx("div",{className:"text-3xl font-bold mb-1",children:x.value}),s.jsx("div",{className:"text-sm text-white/70",children:x.label})]},b))})]})})]})]})};export{ft as default};
