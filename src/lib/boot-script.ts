/**
 * Pre-hydration boot script.
 *
 * The server always renders `<html lang="ar" dir="rtl">` with a light theme, but
 * a returning visitor may have chosen English or dark mode. React cannot know
 * that during SSR, so this tiny inline script applies the stored choice while
 * the document is still being parsed — before first paint — which removes the
 * flash of the wrong language/direction/colour.
 *
 * It is a module constant (never built from user input), so there is no
 * injection surface, and it is wrapped in try/catch for private-browsing
 * storages that throw on access.
 */
export const BOOT_SCRIPT = `(function(){
try{
var d=document.documentElement;
var l=null;
try{l=window.localStorage.getItem("eltawkol.lang");}catch(e){l=null;}
if(l!=="ar"&&l!=="en"){l="ar";}
d.lang=l;
d.dir=(l==="ar")?"rtl":"ltr";
var t=null;
try{t=window.localStorage.getItem("eltawkol.theme");}catch(e){t=null;}
var dark;
if(t==="light"){dark=false;}else if(t==="dark"){dark=true;}else{
dark=(typeof window.matchMedia==="function")&&window.matchMedia("(prefers-color-scheme: dark)").matches;}
if(dark){d.classList.add("dark");}else{d.classList.remove("dark");}
}catch(e){}
})();`;
