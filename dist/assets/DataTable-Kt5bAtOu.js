import{c as j,r as k,j as r}from"./main-DAPsYT4a.js";import{e as u}from"./SidebarPremium-B0l6FvNw.js";import"./button-DFkxrTs2.js";import{c as s,t as b}from"./DashboardHeader-tBreTLm8.js";import{C as y}from"./chevron-up-DF4ET_PF.js";import{C as N}from"./chevron-down-gl_d4Nmb.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"m7 15 5 5 5-5",key:"1hf1tw"}],["path",{d:"m7 9 5-5 5 5",key:"sgt6xg"}]],$=j("chevrons-up-down",w),E=({columns:l=[],data:d=[],onRowClick:o,sortBy:i=null,sortOrder:c="asc",onSort:h,loading:p=!1,emptyState:n=null})=>{const[g,x]=k.useState(null),f=e=>{if(!h||!l.find(t=>t.key===e)?.sortable)return;h(e,i===e&&c==="asc"?"desc":"asc")},m=(e,a)=>a?i!==e?r.jsx($,{className:"w-4 h-4 ml-2 opacity-40"}):c==="asc"?r.jsx(y,{className:"w-4 h-4 ml-2 text-blue-600 dark:text-blue-400"}):r.jsx(N,{className:"w-4 h-4 ml-2 text-blue-600 dark:text-blue-400"}):null,v=(e,a)=>{if(e.render)return e.render(a[e.key],a);const t=a[e.key];return e.type==="badge"?r.jsx(u,{className:e.getBadgeColor?.(t)||"",children:t}):e.type==="date"&&t?new Date(t).toLocaleDateString("pt-BR"):e.type==="number"?t?.toLocaleString("pt-BR")||"-":t||"-"};return p?r.jsxs("div",{className:"w-full p-12 text-center",children:[r.jsx("div",{className:"animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"}),r.jsx("p",{className:s.text.secondary,children:"Carregando..."})]}):d.length===0&&n?n:r.jsxs("div",{className:"w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700",children:[r.jsxs("table",{className:"w-full",children:[r.jsx("thead",{className:"bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700",children:r.jsx("tr",{children:l.map(e=>r.jsx("th",{onClick:()=>f(e.key),className:`
                  px-6 py-4 text-left ${b.bodySmall} font-semibold ${s.text.primary}
                  ${e.sortable?"cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none":""}
                  ${e.width?`w-${e.width}`:""}
                `,children:r.jsxs("div",{className:"flex items-center",children:[e.label,m(e.key,e.sortable)]})},e.key))})}),r.jsx("tbody",{className:"divide-y divide-slate-200 dark:divide-slate-700",children:d.map((e,a)=>r.jsx("tr",{onClick:()=>o?.(e),onMouseEnter:()=>x(a),onMouseLeave:()=>x(null),className:`
                transition-colors
                ${o?"cursor-pointer":""}
                ${g===a?"bg-slate-50 dark:bg-slate-900":"bg-white dark:bg-slate-950"}
                hover:bg-slate-50 dark:hover:bg-slate-900
              `,children:l.map(t=>r.jsx("td",{className:`
                    px-6 py-4 ${b.bodySmall} ${s.text.primary}
                    ${t.align==="center"?"text-center":t.align==="right"?"text-right":"text-left"}
                  `,children:v(t,e)},t.key))},e.id||a))})]}),d.length===0&&!n&&r.jsx("div",{className:"p-12 text-center",children:r.jsx("p",{className:s.text.secondary,children:"Nenhum dado encontrado"})})]})};export{E as D};
