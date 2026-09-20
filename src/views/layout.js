import { escapeHtml } from '../lib/html.js';

const STYLES = `
:root{--royal:#003399;--midblue:#1a1a80;--gray:#f5f7fb;--softgray:#e9ecf5;--black:#111;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Open Sans",sans-serif;color:var(--black);background:#fff;line-height:1.7;}
.topbar{background:var(--royal);color:#fff;text-align:center;padding:10px 6vw;font-size:.95rem;font-weight:700;}
.sitenav{display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between;padding:16px 6vw;border-bottom:1px solid var(--softgray);}
.sitenav a{color:var(--royal);text-decoration:none;font-weight:600;}
.sitenav .brand{font-family:"Montserrat",sans-serif;font-weight:700;font-size:1.05rem;}
.wrap{max-width:820px;margin:0 auto;padding:44px 6vw 64px;}
.wrap.wide{max-width:1080px;}
h1,h2,h3,h4{font-family:"Montserrat",sans-serif;color:var(--royal);line-height:1.3;}
.page-head h1{font-size:clamp(1.8rem,4vw,2.6rem);margin-bottom:10px;}
.page-head p.lede{color:#444;font-size:1.05rem;max-width:680px;}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-top:34px;}
.card{border:1px solid var(--softgray);border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:box-shadow .2s ease,transform .2s ease;}
.card:hover{box-shadow:0 10px 28px rgba(0,51,153,.12);transform:translateY(-2px);}
.card img{width:100%;height:178px;object-fit:cover;display:block;background:var(--gray);}
.card-body{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1;}
.card h2{font-size:1.16rem;}
.card h2 a{color:var(--royal);text-decoration:none;}
.card p{color:#444;font-size:.96rem;}
.meta{color:#667;font-size:.83rem;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:auto;padding-top:6px;}
.pill{display:inline-block;background:var(--gray);color:var(--midblue);border-radius:999px;padding:3px 11px;font-size:.76rem;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
.article-head{border-bottom:1px solid var(--softgray);padding-bottom:22px;margin-bottom:28px;}
.article-head h1{font-size:clamp(1.9rem,4.4vw,2.7rem);margin-bottom:12px;}
.article-head .subtitle{color:#444;font-size:1.1rem;margin-bottom:14px;}
.hero-img{width:100%;border-radius:12px;margin:0 0 30px;display:block;}
.article-body{font-size:1.06rem;}
.article-body h2{font-size:1.5rem;margin:34px 0 12px;}
.article-body h3{font-size:1.22rem;margin:26px 0 10px;}
.article-body p{margin:0 0 18px;}
.article-body ul,.article-body ol{margin:0 0 18px 24px;}
.article-body li{margin-bottom:8px;}
.article-body a{color:var(--royal);}
.article-body img{max-width:100%;height:auto;border-radius:10px;}
.article-body blockquote{border-left:4px solid var(--royal);background:var(--gray);margin:0 0 18px;padding:14px 18px;border-radius:0 8px 8px 0;}
.article-body table{width:100%;border-collapse:collapse;margin:0 0 18px;}
.article-body th,.article-body td{border:1px solid var(--softgray);padding:10px 12px;text-align:left;}
.article-body pre{overflow-x:auto;background:var(--gray);padding:14px;border-radius:8px;}
.faq{margin-top:44px;border-top:1px solid var(--softgray);padding-top:28px;}
.faq details{border:1px solid var(--softgray);border-radius:10px;padding:14px 18px;margin-bottom:12px;}
.faq summary{font-weight:700;color:var(--royal);cursor:pointer;font-family:"Montserrat",sans-serif;}
.faq details p{margin-top:10px;}
.tags{margin-top:30px;display:flex;flex-wrap:wrap;gap:8px;}
.cta-box{margin-top:44px;background:linear-gradient(to right,#ffffff 0%,#eef2f9 100%);border:1px solid var(--softgray);border-radius:12px;padding:26px;text-align:center;}
.cta-btn{background:var(--royal);color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;text-transform:uppercase;letter-spacing:.4px;box-shadow:0 8px 24px rgba(0,51,153,.3);display:inline-block;margin-top:14px;}
.empty{background:var(--gray);border-radius:12px;padding:40px;text-align:center;color:#556;margin-top:30px;}
.back{display:inline-block;margin-bottom:22px;color:var(--royal);text-decoration:none;font-weight:600;}
footer{background:#112;color:#fff;text-align:center;padding:40px 15px;}
footer a{color:#9bb3ff;text-decoration:none;}
@media(max-width:640px){.card img{height:160px;}}
`;

const NAV = `
  <div class="topbar">Appointments Available Today • 48-Hour Results + Money-Back Guarantee • HIPAA-Compliant Telehealth</div>
  <nav class="sitenav" aria-label="Primary">
    <a class="brand" href="/">Dynamic Mental Health Services</a>
    <span><a href="/">Home</a> &nbsp;•&nbsp; <a href="/blog">Blog</a></span>
  </nav>
`;

const FOOTER = `
  <footer role="contentinfo">
    <p>© ${new Date().getFullYear()} Dynamic Mental Health Services, LLC • HIPAA Compliant • All Rights Reserved</p>
    <p style="margin-top:8px;"><a href="/privacy.html">Privacy</a> • <a href="/terms.html">Terms</a> • <a href="/blog">Blog</a></p>
  </footer>
`;

/**
 * Wraps page-specific <head> tags and body markup in the site chrome. Every
 * blog response is rendered here on the server, so crawlers get the full
 * content in the first HTML response without running JavaScript.
 */
export function renderDocument({ head = '', body = '', lang = 'en' }) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang || 'en')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#003399" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
${head}
<style>${STYLES}</style>
</head>
<body>
${NAV}
${body}
${FOOTER}
</body>
</html>
`;
}
