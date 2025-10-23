import{c as n,s as a}from"./main-lplkbHVD.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],u=n("eye-off",c);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],d=n("lock",s),l=async(e,o)=>{try{const{data:r,error:t}=await a.functions.invoke("auth-guard-login",{body:{email:e,password:o}});if(t)throw console.error("Erro na Edge Function auth-guard-login:",t),t;return r}catch(r){throw console.error("Erro ao validar login:",r),r}},g=async e=>{try{const{data:o,error:r}=await a.functions.invoke("auth-guard-register",{body:e});if(r)throw console.error("Erro na Edge Function auth-guard-register:",r),r;return o}catch(o){throw console.error("Erro ao validar registro:",o),o}},h=async e=>{try{const{data:o,error:r}=await a.functions.invoke("auth-login-success",{body:{userId:e}});return r?(console.error("Erro na Edge Function auth-login-success:",r),null):o}catch(o){return console.error("Erro no callback de login:",o),null}},y=async(e,o)=>{try{const{data:r,error:t}=await a.functions.invoke("auth-register-success",{body:{userId:e,userData:o}});return t?(console.error("Erro na Edge Function auth-register-success:",t),null):r}catch(r){return console.error("Erro no callback de registro:",r),null}};export{u as E,d as L,g as a,y as b,h as o,l as v};
