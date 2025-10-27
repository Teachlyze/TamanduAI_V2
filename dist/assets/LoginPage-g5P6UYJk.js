import{r as m,a as K,u as Z,s as G,j as s,L as z}from"./main-Cr4CeQqJ.js";import{m as j,B as Q}from"./button-VDnOzUX8.js";import{I as _}from"./input-DJYxsXYr.js";import{L as P}from"./label-Cj0ah_CE.js";import{A as W,a as Y}from"./alert-DuQPktx4.js";import{S as F}from"./sparkles-DYtyTt7R.js";import{C as J}from"./circle-alert-B-sotHTf.js";import{M as V}from"./mail-CMXDTSaq.js";import{L as X,E as ee}from"./lock-BFAJD90m.js";import{E as te}from"./eye-yXwZUmlL.js";import{A as ae}from"./arrow-right-C3L3IoCJ.js";import{U as se}from"./users-BI0WtoMm.js";import{C as re}from"./chart-column-DHMA61nx.js";let ie={data:""},oe=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||ie},ne=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,le=/\/\*[^]*?\*\/|  +/g,O=/\n+/g,w=(e,t)=>{let a="",i="",l="";for(let o in e){let r=e[o];o[0]=="@"?o[1]=="i"?a=o+" "+r+";":i+=o[1]=="f"?w(r,o):o+"{"+w(r,o[1]=="k"?"":t)+"}":typeof r=="object"?i+=w(r,t?t.replace(/([^,])+/g,n=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,n):n?n+" "+d:d)):o):r!=null&&(o=/^--/.test(o)?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=w.p?w.p(o,r):o+":"+r+";")}return a+(t&&l?t+"{"+l+"}":l)+i},y={},D=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+D(e[a]);return t}return e},de=(e,t,a,i,l)=>{let o=D(e),r=y[o]||(y[o]=(d=>{let c=0,x=11;for(;c<d.length;)x=101*x+d.charCodeAt(c++)>>>0;return"go"+x})(o));if(!y[r]){let d=o!==e?e:(c=>{let x,u,b=[{}];for(;x=ne.exec(c.replace(le,""));)x[4]?b.shift():x[3]?(u=x[3].replace(O," ").trim(),b.unshift(b[0][u]=b[0][u]||{})):b[0][x[1]]=x[2].replace(O," ").trim();return b[0]})(e);y[r]=w(l?{["@keyframes "+r]:d}:d,a?"":"."+r)}let n=a&&y.g?y.g:null;return a&&(y.g=y[r]),((d,c,x,u)=>{u?c.data=c.data.replace(u,d):c.data.indexOf(d)===-1&&(c.data=x?d+c.data:c.data+d)})(y[r],t,i,n),r},ce=(e,t,a)=>e.reduce((i,l,o)=>{let r=t[o];if(r&&r.call){let n=r(a),d=n&&n.props&&n.props.className||/^go/.test(n)&&n;r=d?"."+d:n&&typeof n=="object"?n.props?"":w(n,""):n===!1?"":n}return i+l+(r??"")},"");function $(e){let t=this||{},a=e.call?e(t.p):e;return de(a.unshift?a.raw?ce(a,[].slice.call(arguments,1),t.p):a.reduce((i,l)=>Object.assign(i,l&&l.call?l(t.p):l),{}):a,oe(t.target),t.g,t.o,t.k)}let q,C,I;$.bind({g:1});let v=$.bind({k:1});function me(e,t,a,i){w.p=t,q=e,C=a,I=i}function N(e,t){let a=this||{};return function(){let i=arguments;function l(o,r){let n=Object.assign({},o),d=n.className||l.className;a.p=Object.assign({theme:C&&C()},n),a.o=/ *go\d+/.test(d),n.className=$.apply(a,i)+(d?" "+d:"");let c=e;return e[0]&&(c=n.as||e,delete n.as),I&&c[0]&&I(n),q(c,n)}return l}}var pe=e=>typeof e=="function",S=(e,t)=>pe(e)?e(t):e,ue=(()=>{let e=0;return()=>(++e).toString()})(),fe=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),xe=20,R="default",T=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:i}=t;return T(e,{type:e.toasts.find(r=>r.id===i.id)?1:0,toast:i});case 3:let{toastId:l}=t;return{...e,toasts:e.toasts.map(r=>r.id===l||l===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let o=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+o}))}}},he=[],ge={toasts:[],pausedAt:void 0,settings:{toastLimit:xe}},E={},M=(e,t=R)=>{E[t]=T(E[t]||ge,e),he.forEach(([a,i])=>{a===t&&i(E[t])})},B=e=>Object.keys(E).forEach(t=>M(e,t)),be=e=>Object.keys(E).find(t=>E[t].toasts.some(a=>a.id===e)),L=(e=R)=>t=>{M(t,e)},ye=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||ue()}),A=e=>(t,a)=>{let i=ye(t,e,a);return L(i.toasterId||be(i.id))({type:2,toast:i}),i.id},p=(e,t)=>A("blank")(e,t);p.error=A("error");p.success=A("success");p.loading=A("loading");p.custom=A("custom");p.dismiss=(e,t)=>{let a={type:3,toastId:e};t?L(t)(a):B(a)};p.dismissAll=e=>p.dismiss(void 0,e);p.remove=(e,t)=>{let a={type:4,toastId:e};t?L(t)(a):B(a)};p.removeAll=e=>p.remove(void 0,e);p.promise=(e,t,a)=>{let i=p.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(l=>{let o=t.success?S(t.success,l):void 0;return o?p.success(o,{id:i,...a,...a?.success}):p.dismiss(i),l}).catch(l=>{let o=t.error?S(t.error,l):void 0;o?p.error(o,{id:i,...a,...a?.error}):p.dismiss(i)}),e};var ve=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,je=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,we=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ne=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ve} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${je} 0.15s ease-out forwards;
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
    animation: ${we} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Ee=v`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ke=N("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Ee} 1s linear infinite;
`,Ae=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,$e=v`
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
}`,ze=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ae} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${$e} 0.2s ease-out forwards;
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
`,Ce=N("div")`
  position: absolute;
`,Ie=N("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Se=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Le=N("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Se} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,_e=({toast:e})=>{let{icon:t,type:a,iconTheme:i}=e;return t!==void 0?typeof t=="string"?m.createElement(Le,null,t):t:a==="blank"?null:m.createElement(Ie,null,m.createElement(ke,{...i}),a!=="loading"&&m.createElement(Ce,null,a==="error"?m.createElement(Ne,{...i}):m.createElement(ze,{...i})))},Pe=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Fe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Oe="0%{opacity:0;} 100%{opacity:1;}",De="0%{opacity:1;} 100%{opacity:0;}",qe=N("div")`
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
`,Re=N("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Te=(e,t)=>{let a=e.includes("top")?1:-1,[i,l]=fe()?[Oe,De]:[Pe(a),Fe(a)];return{animation:t?`${v(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(l)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};m.memo(({toast:e,position:t,style:a,children:i})=>{let l=e.height?Te(e.position||t||"top-center",e.visible):{opacity:0},o=m.createElement(_e,{toast:e}),r=m.createElement(Re,{...e.ariaProps},S(e.message,e));return m.createElement(qe,{className:e.className,style:{...l,...a,...e.style}},typeof i=="function"?i({icon:o,message:r}):m.createElement(m.Fragment,null,o,r))});me(m.createElement);$`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;var Me=p;const tt=()=>{const[e,t]=m.useState({email:"",password:""}),[a,i]=m.useState(!1),[l,o]=m.useState(!1),[r,n]=m.useState(""),{signIn:d,user:c,loading:x}=K(),u=Z();m.useEffect(()=>{c&&G.from("profiles").select("role").eq("id",c.id).single().then(({data:f,error:h})=>{let g=null;h?(console.error("Profile fetch error:",h),g=c.user_metadata?.role||c.user_metadata?.user_role,console.log("Usando role do user_metadata:",g)):g=f?.role,u(g==="student"?"/students/dashboard":"/dashboard")}).catch(f=>{console.error("Auto-redirect error:",f),u("/dashboard")})},[c,u]);const b=f=>{const{name:h,value:g}=f.target;t(k=>({...k,[h]:g})),n("")},U=async f=>{if(f.preventDefault(),n(""),!e.email||!e.password){n("Por favor, preencha todos os campos");return}if(!e.email.includes("@")){n("Por favor, insira um e-mail válido");return}o(!0);try{const{data:h,error:g}=await d(e.email,e.password);if(g){g.message.includes("Invalid login credentials")?n("E-mail ou senha incorretos"):g.message.includes("Email not confirmed")?n("Por favor, confirme seu e-mail antes de fazer login"):n(g.message||"Erro ao fazer login. Tente novamente.");return}if(h?.user){Me.success("Login realizado com sucesso!");const k=h.user.user_metadata?.role;u(k==="student"?"/students":k==="teacher"?"/dashboard":k==="school"?"/school":"/dashboard")}}catch(h){console.error("Login error:",h),n("Erro ao fazer login. Tente novamente.")}finally{o(!1)}},H=[{icon:F,title:"IA Avançada",description:"Chatbot inteligente para suas turmas"},{icon:se,title:"Gestão Fácil",description:"Organize alunos e professores"},{icon:re,title:"Analytics",description:"Acompanhe o progresso em tempo real"}];return s.jsxs("div",{className:"min-h-screen flex",children:[s.jsx("div",{className:"flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background",children:s.jsxs(j.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{duration:.5},className:"w-full max-w-md",children:[s.jsxs(z,{to:"/",className:"flex items-center justify-center gap-3 mb-8",children:[s.jsx("div",{className:"w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800",children:s.jsx(F,{className:"w-7 h-7 text-white"})}),s.jsx("span",{className:"text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent",children:"TamanduAI"})]}),s.jsxs(j.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"text-center mb-8",children:[s.jsx("h2",{className:"text-3xl font-bold text-foreground mb-2",children:"Bem-vindo de volta!"}),s.jsx("p",{className:"text-muted-foreground",children:"Entre para continuar gerenciando suas turmas"})]}),s.jsxs(j.form,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.2},onSubmit:U,className:"space-y-6",children:[r&&s.jsxs(W,{variant:"destructive",className:"mb-6",children:[s.jsx(J,{className:"w-4 h-4"}),s.jsx(Y,{children:r})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsx(P,{htmlFor:"email",children:"E-mail"}),s.jsxs("div",{className:"relative",children:[s.jsx(V,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(_,{id:"email",name:"email",type:"email",placeholder:"seu@email.com",value:e.email,onChange:b,className:"pl-10 h-12",disabled:l,autoComplete:"email",required:!0})]})]}),s.jsxs("div",{className:"space-y-2",children:[s.jsxs("div",{className:"flex items-center justify-between",children:[s.jsx(P,{htmlFor:"password",children:"Senha"}),s.jsx(z,{to:"/forgot-password",className:"text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline",children:"Esqueceu a senha?"})]}),s.jsxs("div",{className:"relative",children:[s.jsx(X,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"}),s.jsx(_,{id:"password",name:"password",type:a?"text":"password",placeholder:"••••••••",value:e.password,onChange:b,className:"pl-10 pr-10 h-12",disabled:l,autoComplete:"current-password",required:!0}),s.jsx("button",{type:"button",onClick:()=>i(!a),className:"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",tabIndex:-1,children:a?s.jsx(ee,{className:"w-5 h-5"}):s.jsx(te,{className:"w-5 h-5"})})]})]}),s.jsx(Q,{type:"submit",variant:"gradient",size:"lg",className:"w-full",disabled:l,rightIcon:s.jsx(ae,{className:"w-5 h-5"}),children:l?"Entrando...":"Entrar"})]}),s.jsxs(j.div,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.3},className:"my-8 flex items-center gap-4",children:[s.jsx("div",{className:"flex-1 h-px bg-border"}),s.jsx("span",{className:"text-sm text-muted-foreground",children:"ou"}),s.jsx("div",{className:"flex-1 h-px bg-border"})]}),s.jsxs(j.p,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},className:"text-center text-muted-foreground",children:["Não tem uma conta?"," ",s.jsx(z,{to:"/register",className:"text-blue-600 dark:text-blue-400 font-semibold hover:underline",children:"Cadastre-se grátis"})]})]})}),s.jsxs("div",{className:"hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-cyan-700 via-blue-700 to-blue-900",children:[s.jsx("div",{className:"absolute inset-0 opacity-10",children:s.jsx("div",{className:"absolute inset-0",style:{backgroundImage:"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",backgroundSize:"40px 40px"}})}),s.jsx("div",{className:"relative z-10 flex flex-col justify-center px-12 text-white",children:s.jsxs(j.div,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3,duration:.6},children:[s.jsxs("h2",{className:"text-4xl font-bold mb-6",children:["A plataforma educacional",s.jsx("br",{}),"que professores adoram"]}),s.jsxs("p",{className:"text-xl text-white/90 mb-12",children:["Reduza 70% do tempo em tarefas administrativas e",s.jsx("br",{}),"foque no que realmente importa: ensinar."]}),s.jsx("div",{className:"space-y-6",children:H.map((f,h)=>s.jsxs(j.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.5+h*.1},className:"flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20",children:[s.jsx("div",{className:"w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0",children:s.jsx(f.icon,{className:"w-6 h-6"})}),s.jsxs("div",{children:[s.jsx("h3",{className:"font-semibold text-lg mb-1",children:f.title}),s.jsx("p",{className:"text-white/80 text-sm",children:f.description})]})]},f.title))}),s.jsx(j.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.9},className:"mt-12 grid grid-cols-3 gap-6",children:[{value:"10K+",label:"Professores"},{value:"50K+",label:"Alunos"},{value:"99%",label:"Satisfação"}].map((f,h)=>s.jsxs("div",{className:"text-center",children:[s.jsx("div",{className:"text-3xl font-bold mb-1",children:f.value}),s.jsx("div",{className:"text-sm text-white/70",children:f.label})]},h))})]})})]})]})};export{tt as default};
