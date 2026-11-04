import{d as r,j as s,P as c,t as i,C as d}from"./index-CN8REocs.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=r("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);function h({items:e,openFirst:a=!0}){return s.jsx("div",{className:"faq-list",children:e.map((t,n)=>s.jsxs("details",{open:a&&n===0,children:[s.jsxs("summary",{children:[t.q,"?",s.jsx(l,{size:18,strokeWidth:1.5})]}),s.jsx("p",{children:t.a})]},t.q))})}function x(){return s.jsxs("main",{children:[s.jsx(c,{title:i("faq.title"),children:i("faq.lead")}),i("faq.groups").map((e,a)=>s.jsx("section",{className:`section${a===0?" section-tight":""}`,children:s.jsxs("div",{className:"wrap faq",children:[s.jsx("div",{className:"section-head",children:s.jsx("h2",{children:e.group})}),s.jsx(h,{items:e.items,openFirst:a===0})]})},e.group)),s.jsx(d,{})]})}export{h as FaqList,x as default};
