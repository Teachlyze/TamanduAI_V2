import{r as p,b as G,u as Q,d as W,l as k,j as s,L as A}from"./main-C5n3kzXQ.js";import{B as Y}from"./button-CXfsJEZz.js";import{I as O}from"./input-Bec_LEaF.js";import{L as T}from"./label-B7q1QW2O.js";import{A as J,a as V}from"./alert-B94-vXqC.js";import{m as v}from"./proxy-C-9wZx5L.js";import{B as X}from"./book-open-BP8V__Hw.js";import{C as ee}from"./circle-alert--zWTLTwH.js";import{M as te}from"./mail-CoZBlYR2.js";import{L as ae}from"./lock-CjLlJVRP.js";import{E as se}from"./eye-off-gOjABYGa.js";import{E as re}from"./eye-DehCU-UL.js";import{A as ie}from"./arrow-right-B7s7iPeM.js";import{S as oe}from"./sparkles-D7qwm8wx.js";import{U as ne}from"./users-Boys-rM5.js";import{C as le}from"./chart-column-5ubExldJ.js";let de={data:""},ce=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||de},me=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,pe=/\/\*[^]*?\*\/|  +/g,_=/\n+/g,j=(e,t)=>{let a="",i="",l="";for(let o in e){let r=e[o];o[0]=="@"?o[1]=="i"?a=o+" "+r+";":i+=o[1]=="f"?j(r,o):o+"{"+j(r,o[1]=="k"?"":t)+"}":typeof r=="object"?i+=j(r,t?t.replace(/([^,])+/g,n=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,n):n?n+" "+d:d)):o):r!=null&&(o=/^--/.test(o)?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=j.p?j.p(o,r):o+":"+r+";")}return a+(t&&l?t+"{"+l+"}":l)+i},b={},D=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+D(e[a]);return t}return e},ue=(e,t,a,i,l)=>{let o=D(e),r=b[o]||(b[o]=(d=>{let c=0,m=11;for(;c<d.length;)m=101*m+d.charCodeAt(c++)>>>0;return"go"+m})(o));if(!b[r]){let d=o!==e?e:(c=>{let m,g,x=[{}];for(;m=me.exec(c.replace(pe,""));)m[4]?x.shift():m[3]?(g=m[3].replace(_," ").trim(),x.unshift(x[0][g]=x[0][g]||{})):x[0][m[1]]=m[2].replace(_," ").trim();return x[0]})(e);b[r]=j(l?{["@keyframes "+r]:d}:d,a?"":"."+r)}let n=a&&b.g?b.g:null;return a&&(b.g=b[r]),((d,c,m,g)=>{g?c.data=c.data.replace(g,d):c.data.indexOf(d)===-1&&(c.data=m?d+c.data:c.data+d)})(b[r],t,i,n),r},fe=(e,t,a)=>e.reduce((i,l,o)=>{let r=t[o];if(r&&r.call){let n=r(a),d=n&&n.props&&n.props.className||/^go/.test(n)&&n;r=d?"."+d:n&&typeof n=="object"?n.props?"":j(n,""):n===!1?"":n}return i+l+(r??"")},"");function $(e){let t=this||{},a=e.call?e(t.p):e;return ue(a.unshift?a.raw?fe(a,[].slice.call(arguments,1),t.p):a.reduce((i,l)=>Object.assign(i,l&&l.call?l(t.p):l),{}):a,ce(t.target),t.g,t.o,t.k)}let q,P,z;$.bind({g:1});let y=$.bind({k:1});function xe(e,t,a,i){j.p=t,q=e,P=a,z=i}function w(e,t){let a=this||{};return function(){let i=arguments;function l(o,r){let n=Object.assign({},o),d=n.className||l.className;a.p=Object.assign({theme:P&&P()},n),a.o=/ *go\d+/.test(d),n.className=$.apply(a,i)+(d?" "+d:"");let c=e;return e[0]&&(c=n.as||e,delete n.as),z&&c[0]&&z(n),q(c,n)}return l}}var ge=e=>typeof e=="function",C=(e,t)=>ge(e)?e(t):e,he=(()=>{let e=0;return()=>(++e).toString()})(),be=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ye=20,R="default",B=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:i}=t;return B(e,{type:e.toasts.find(r=>r.id===i.id)?1:0,toast:i});case 3:let{toastId:l}=t;return{...e,toasts:e.toasts.map(r=>r.id===l||l===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let o=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+o}))}}},ve=[],je={toasts:[],pausedAt:void 0,settings:{toastLimit:ye}},E={},M=(e,t=R)=>{E[t]=B(E[t]||je,e),ve.forEach(([a,i])=>{a===t&&i(E[t])})},U=e=>Object.keys(E).forEach(t=>M(e,t)),we=e=>Object.keys(E).find(t=>E[t].toasts.some(a=>a.id===e)),I=(e=R)=>t=>{M(t,e)},Ne=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||he()}),L=e=>(t,a)=>{let i=Ne(t,e,a);return I(i.toasterId||we(i.id))({type:2,toast:i}),i.id},u=(e,t)=>L("blank")(e,t);u.error=L("error");u.success=L("success");u.loading=L("loading");u.custom=L("custom");u.dismiss=(e,t)=>{let a={type:3,toastId:e};t?I(t)(a):U(a)};u.dismissAll=e=>u.dismiss(void 0,e);u.remove=(e,t)=>{let a={type:4,toastId:e};t?I(t)(a):U(a)};u.removeAll=e=>u.remove(void 0,e);u.promise=(e,t,a)=>{let i=u.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(l=>{let o=t.success?C(t.success,l):void 0;return o?u.success(o,{id:i,...a,...a?.success}):u.dismiss(i),l}).catch(l=>{let o=t.error?C(t.error,l):void 0;o?u.error(o,{id:i,...a,...a?.error}):u.dismiss(i)}),e};var ke=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Ee=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ae=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Le=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ke} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ee} 0.15s ease-out forwards;
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
    animation: ${Ae} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,$e=y`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Pe=w("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${$e} 1s linear infinite;
`,ze=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Ce=y`
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
}`,Ie=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ze} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Ce} 0.2s ease-out forwards;
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
`,Se=w("div")`
  position: absolute;
`,Fe=w("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Oe=y`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Te=w("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Oe} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,_e=({toast:e})=>{let{icon:t,type:a,iconTheme:i}=e;return t!==void 0?typeof t=="string"?p.createElement(Te,null,t):t:a==="blank"?null:p.createElement(Fe,null,p.createElement(Pe,{...i}),a!=="loading"&&p.createElement(Se,null,a==="error"?p.createElement(Le,{...i}):p.createElement(Ie,{...i})))},De=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,qe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Re="0%{opacity:0;} 100%{opacity:1;}",Be="0%{opacity:1;} 100%{opacity:0;}",Me=w("div")`
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
`,Ue=w("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,He=(e,t)=>{let a=e.includes("top")?1:-1,[i,l]=be()?[Re,Be]:[De(a),qe(a)];return{animation:t?`${y(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(l)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};p.memo(({toast:e,position:t,style:a,children:i})=>{let l=e.height?He(e.position||t||"top-center",e.visible):{opacity:0},o=p.createElement(_e,{toast:e}),r=p.createElement(Ue,{...e.ariaProps},C(e.message,e));return p.createElement(Me,{className:e.className,style:{...l,...a,...e.style}},typeof i=="function"?i({icon:o,message:r}):p.createElement(p.Fragment,null,o,r))});xe(p.createElement);$`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;var Ke=u;const lt=()=>{const[e,t]=p.useState({email:"",password:""}),[a,i]=p.useState(!1),[l,o]=p.useState(!1),[r,n]=p.useState(""),{signIn:d,user:c,profile:m,loading:g}=G(),x=Q(),S=W();p.useEffect(()=>{if(console.log("[LoginPage] Auth state:",{hasUser:!!c,hasProfile:!!m,authLoading:g,profileRole:m?.role}),c&&m&&!g){k.debug("[LoginPage] ✅ All conditions met, redirecting to:",m.role);const f=m.role;f==="student"?(k.debug("[LoginPage] Navigating to /students/dashboard"),x("/students/dashboard")):f==="teacher"?(k.debug("[LoginPage] Navigating to /dashboard"),x("/dashboard")):f==="school"?(k.debug("[LoginPage] Navigating to /school"),x("/school")):(k.debug("[LoginPage] Fallback: Navigating to /dashboard"),x("/dashboard"))}},[c,m,g,x]);const F=f=>{const{name:h,value:N}=f.target;t(Z=>({...Z,[h]:N})),n("")},H=async f=>{if(f.preventDefault(),n(""),!e.email||!e.password){n("Por favor, preencha todos os campos");return}if(!e.email.includes("@")){n("Por favor, insira um e-mail válido");return}o(!0);try{const{data:h,error:N}=await d(e.email,e.password);if(N){N.message.includes("Invalid login credentials")?n("E-mail ou senha incorretos"):N.message.includes("Email not confirmed")?n("Por favor, confirme seu e-mail antes de fazer login"):n(N.message||"Erro ao fazer login. Tente novamente.");return}h?.user&&Ke.success("Login realizado com sucesso!")}catch(h){k.error("Login error:",h),n("Erro ao fazer login. Tente novamente.")}finally{o(!1)}},K=[{icon:oe,title:"IA Avançada",description:"Chatbot inteligente para suas turmas"},{icon:ne,title:"Gestão Fácil",description:"Organize alunos e professores"},{icon:le,title:"Analytics",description:"Acompanhe o progresso em tempo real"}];return s.jsxs("div",{className:"min-h-screen flex",children:[s.jsx("div",{className:"flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",children:s.jsxs(v.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{duration:.5},className:"w-full max-w-md",children:[s.jsxs(A,{to:"/",className:"flex items-center justify-center gap-3 mb-8",children:[s.jsx("div",{className:"w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800",children:s.jsx(X,{className:"w-7 h-7 text-white"})}),s.jsx("span",{className:"text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent",children:"TamanduAI"})]}),s.jsxs(v.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"text-center mb-8",children:[s.jsx("h2",{className:"text-3xl font-bold text-foreground mb-2",children:"Bem-vindo de volta!"}),s.jsx("p",{className:"text-muted-foreground",children:"Entre para continuar gerenciando suas turmas"})]}),s.jsxs(v.form,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.2},onSubmit:H,className:"space-y-6",children:[r&&s.jsxs(J,{variant:"destructive",className:"mb-6",children:[s.jsx(ee,{className:"w-4 h-4"}),s.jsx(V,{children:r})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsx(T,{htmlFor:"email",children:"E-mail"}),s.jsxs("div",{className:"relative",children:[s.jsx(te,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(O,{id:"email",name:"email",type:"email",placeholder:"seu@email.com",value:e.email,onChange:F,className:"pl-10 h-12",disabled:l,autoComplete:"email",required:!0})]})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsxs("div",{className:"flex items-center justify-between",children:[s.jsx(T,{htmlFor:"password",children:"Senha"}),s.jsx(A,{to:"/forgot-password",className:"text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline",children:"Esqueceu a senha?"})]}),s.jsxs("div",{className:"relative",children:[s.jsx(ae,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(O,{id:"password",name:"password",type:a?"text":"password",placeholder:"••••••••",value:e.password,onChange:F,className:"pl-10 pr-10 h-12",disabled:l,autoComplete:"current-password",required:!0}),s.jsx("button",{type:"button",onClick:()=>i(!a),className:"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",tabIndex:-1,children:a?s.jsx(se,{className:"w-5 h-5"}):s.jsx(re,{className:"w-5 h-5"})})]})]}),s.jsx(Y,{type:"submit",variant:"gradient",size:"lg",className:"w-full",disabled:l,rightIcon:s.jsx(ie,{className:"w-5 h-5"}),children:l?"Entrando...":"Entrar"}),s.jsxs("p",{className:"text-xs text-center text-slate-500 dark:text-slate-400 mt-3",children:["Ao fazer login, você concorda com nossos"," ",s.jsx(A,{to:"/terms",target:"_blank",className:"text-blue-600 dark:text-blue-400 hover:underline",children:"Termos de Uso"})," ","e"," ",s.jsx(A,{to:"/privacy",target:"_blank",className:"text-blue-600 dark:text-blue-400 hover:underline",children:"Política de Privacidade"})]})]}),s.jsxs(v.div,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.3},className:"my-8 flex items-center gap-4",children:[s.jsx("div",{className:"flex-1 h-px bg-border"}),s.jsx("span",{className:"text-sm text-muted-foreground",children:"ou"}),s.jsx("div",{className:"flex-1 h-px bg-border"})]}),s.jsxs(v.p,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},className:"text-center text-muted-foreground",children:["Não tem uma conta?"," ",s.jsx(A,{to:"/register",state:S.state?.redirectTo?{redirectTo:S.state.redirectTo}:void 0,className:"text-blue-600 dark:text-blue-400 font-semibold hover:underline",children:"Cadastre-se grátis"})]})]})}),s.jsxs("div",{className:"hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-cyan-700 via-blue-700 to-blue-900",children:[s.jsx("div",{className:"absolute inset-0 opacity-10",children:s.jsx("div",{className:"absolute inset-0",style:{backgroundImage:"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",backgroundSize:"40px 40px"}})}),s.jsx("div",{className:"relative z-10 flex flex-col justify-center px-12 text-white",children:s.jsxs(v.div,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3,duration:.6},children:[s.jsxs("h2",{className:"text-4xl font-bold mb-6",children:["A plataforma educacional",s.jsx("br",{}),"que professores adoram"]}),s.jsxs("p",{className:"text-xl text-white/90 mb-12",children:["Reduza 70% do tempo em tarefas administrativas e",s.jsx("br",{}),"foque no que realmente importa: ensinar."]}),s.jsx("div",{className:"space-y-6",children:K.map((f,h)=>s.jsxs(v.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.5+h*.1},className:"flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20",children:[s.jsx("div",{className:"w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0",children:s.jsx(f.icon,{className:"w-6 h-6"})}),s.jsxs("div",{children:[s.jsx("h3",{className:"font-semibold text-lg mb-1",children:f.title}),s.jsx("p",{className:"text-white/80 text-sm",children:f.description})]})]},f.title))}),s.jsx(v.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.9},className:"mt-12 grid grid-cols-3 gap-6",children:[{value:"10K+",label:"Professores"},{value:"50K+",label:"Alunos"},{value:"99%",label:"Satisfação"}].map((f,h)=>s.jsxs("div",{className:"text-center",children:[s.jsx("div",{className:"text-3xl font-bold mb-1",children:f.value}),s.jsx("div",{className:"text-sm text-white/70",children:f.label})]},h))})]})})]})]})};export{lt as default};
