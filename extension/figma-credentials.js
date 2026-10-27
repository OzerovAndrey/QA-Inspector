// Credentials remain local to trusted extension contexts, separate from reference caches/reports.
export async function getFigmaToken(){
 await chrome.storage.local.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'});
 const saved=await chrome.storage.local.get('figmaAccessToken');
 if(saved.figmaAccessToken)return saved.figmaAccessToken;
 const legacy=await chrome.storage.session.get('figmaAccessToken');
 if(legacy.figmaAccessToken){await saveFigmaToken(legacy.figmaAccessToken);return legacy.figmaAccessToken;}
 return null;
}
export async function saveFigmaToken(token){await chrome.storage.local.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'});await chrome.storage.local.set({figmaAccessToken:token});await chrome.storage.session.set({figmaAccessToken:null});}
export async function clearFigmaToken(){await chrome.storage.local.set({figmaAccessToken:null});await chrome.storage.session.set({figmaAccessToken:null});}
