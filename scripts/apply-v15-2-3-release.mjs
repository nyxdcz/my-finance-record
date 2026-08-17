import fs from "node:fs";

const VERSION = "15.2.3";
const RELEASE_DATE = "2026-08-17";
const CACHE_VERSION = "finance-v15-20260817-sync-status-r38";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) { fs.writeFileSync(file, content); }
function replaceExact(file, from, to) {
  const source = read(file);
  if (!source.includes(from)) throw new Error(`${file}: expected text not found: ${from.slice(0, 100)}`);
  write(file, source.replace(from, to));
}
function appendOnce(file, marker, content) {
  const source = read(file);
  if (source.includes(marker)) return;
  write(file, `${source.trimEnd()}\n\n${content.trim()}\n`);
}

const icons = {
  "icons/sync-needs-sync-v15-2-3.png": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEoElEQVR4AexY/5UTOQyWUgHbAXTAdcB1cHSw10Gyd38fQwG3oQPoADpYOlg6CB1AA0Tok3+P7fmR3eXl8eI3smXps+TPdmYms6HfpFyInNtGXnbksiNPtAKXozW1sDJsn8tw816G3UFFMrmT4Z+/psae6nu0HZFh+0z8xIn4QCzXRPScyvKK6PhRcZ7cduwv0St6j0JEJ3YvxN80b5qYaG/24oO83R1mYQsADyIidoS2mPJLXpCsCRHSY7jTHXrY7pxMBCQIR4g8Bd+AFS0sJVZ3Z9i+XDi0gp1EJJHI4vlZeT61gzwg8xRY6/C9i52BFqonESHshCWmRhlPOABD2xgCUxzGJ/1mVhMRvTMhb2OBzUzhqFGjBC6hbUBgijnQWSiriWjcdGfSTnlhWSGlFT1YBVXooM0kuLxJbwDbZ15f1Kwioit1141qq4wK4lA87DnIBrozN+s0KrjXHbFVRDSFPtC0Ducqzz5aUqCWCIZBGtin25GUjB2VzgwSbqTlxL0LJojvFo0MW79whbnZmd0RGW4GGfDA2sVpQ+klJ0exmWzsQpw2MFh5H7S5tkvEEcBTW96Mg3RIeNi014OsGSMbxBY/IJtElMQ3IhAYp7L8RdVIrn5YIaq2rk7YjrkVobJVRPQY6QNJ0g+tiC5VAC78wQ0jJPRHbR0mAyRn0jJ3Ry2I6E68V1z5nCiiNSZX+HX0gy/NoRfCoNGF1RfK3Z3oCypsPYlEHFDwH6KHHdll1H/Ebh1a7158ELvpbMuF9mkjESLuP+yoVbBeLfsaWz3jfHTbC0I31d0sI0JNpnRqUZ44qrnUoRRUG6MleceUZIu4EaiKEVHjiiOlo/IrZfNWl1SsEY0b5HgtHjHbVDHVoFc5Tq4l+/9iRNyttoQt6iF4NTsYqfEOzA0btUsVU2HRBgWiNuJ71BBPhOxYBXdolSCVJXnMHrqMXuhAz2TDfxNtXkcLR21S6UTzY1IQ3RWbeyBigOAOLVVrmDyUF8vqfKZ6n735/nf7gYf/P0E3cwAADjFjXUVXVAJmbNjYD78ggnmHPGHY2nacpjseiSBdgHe0MDEJnGLfyUoiQuBCViLYek9frcmn83QTSoMckQ1/cI6sjuDMNqG24GIPsH9fiX5dhD4xvP45ToJrpyNyPO5yV2tSub+lc8toth/6oD1+NBVVH0jpONDqYkR4ePc9HzmVK8ct0atFqQxZlClfhAmVMLbTZEQcRv50barLAcm+RuM14EVYJuYc6E5TJKK78tm5E+MC75xnUbu3BjcVnbedpkgEZnev5xFjeII8xh6FWKe3jKFWyQuokIIIDHr7uBodQme22kabNlv1oGvtVSK/mMI73Y2vwV0RUed3tzNkW0YoneTpEAIUJCQK/dSaxypdrmR2mre7Ds008pqH23c5qCISnDzsrzSd27pukg7DWbMQIKLJINosu5iwuFe62J9oVLpEgNMBX5WQfS0kYqzAF8oKZ3pS1To7O8XoANQQVacuPT781ubxZg8SIFPhJ4nkaB5u9Uzu/2B8+vy18oKH2yGfS0tfTKQ1+JxsFyLntBuYy2VHsArnJL/NjvwEAAD//wj9aH8AAAAGSURBVAMAds1vdNRMU3AAAAAASUVORK5CYII=",
  "icons/sync-issue-offline-v15-2-3.png": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFOUlEQVR4AexY6XUcNwwGVIHdgdyB3UHSQUpwOlgr+b9MCtA6Fcgd2B04HTgdOB3EDUTIB/AYHuDsjKLnt/IzHy+cxEdwuDN7Rd9I+Q7k0hL5PSNPIiMSDj9dWqDn4hmOloQ3/xDxewmH1/SESgNEDAQ9Iyt8J08ITAOEiD9QU/aDAfhrCTfYhDciwW0fJRyum2UegWiAcLj9mYjfkRbWTts2MAg+CAIn4s9EsnYsf1Ad1YXNHT1SaYCozwJGlMptDkawu2IA5Ji1t4/yWm0FPrbb+JoDEFUrYJQobQaGPzeYi/6eCXyEm7DHotd1gajSVjAcTlxOoRpWzQVYK1dzITn+n6M2BaLxcP3MKIM0NL7DUWieAQ6nKiRTtM5lqguToqvmUVdw1B6WmVUgWIq4AROXI5qDqWIz2LS73CMz+2+1s0A0jgIGOJZAfTBQURNr9dwYmzq10ptvk3JR2gREtQ0MUOgySltjH4zJvK4x9hQWHp6XsFDnZ5uBuK4AjFaOGfXF9CtmAtazo8a+63wzEAm/4ocsLjH2mpmbsxfAEHBiRDyJqJzjUkmvSxVzMt0EBGk+EP37fuIjseXsbRYDTurD0EsV2NXmH9kpEN0NwUskGjzKCevOdyfGABXNzMHJDH+BcL0ydbccGOuvOo0/FwgygMAZr/P0DCgag55QuWhXBB6Y2+cQr4OBDw0denWdb16thfkABBn4JCQHyKw6zo2fO5Vry3QcPTCnVTASDZd+dLrInFkDBJkI0Hm50wdMvLoPDONgRTCxB2lOsbEfJfxy9ou1ABF7A5UjPQ4KC4L8q3mSGU5LM3UFt+U9vljt2wafCJ00kQUI2XcEUd4JzFZq2rWi0dNFgMm+zMBgrV7f45NBwk05+lm5ApJZK2PZrDJJyj2d2GWYgvnb37m0MY7byJITwOhjUFYwIJGZjIuopyFwWOC2VVfS1nJBAczvh/5qfkHEDhgmK1gP1aY9YCE54nF4mYRkQKB0pHRCqZTkDLQ5W0hwVqoqa/NU7gEmzMB4BlRF1QYQKf5EqSQgkZqtb0ZZaETUL33imUqaF1k3Ef8CQGYImSG3iMuNTGQFlwHljEQmxyH1E/OOXUgYo9K5y8J0doKJNimsYeCjspqMKGNp6+amBxVUsuALIpNU3UwwO2bUZWZmT7k0GVl/fcgmFjEIix5jWiMNWQpBXbNyzdM5HtdNmWnt81rRg/axpYzwH5GMfa0cOblPTjuFxK0ezKyPMQsxjTUbc9LfmplozXEYegOCr79QS2bKtY4/z0FGqVFifWRYn73XfIBxr2bqjhk1JXkyHQOiUrj9gkZpm2hfMUuYJNeYaY1U7JVuW8efXs1kgdK08G8qKkDw0vbCXFtM1ql8YzPLjbprasiM+ztDUzA4TfYX7wIkvMUDL8akh6WFHlJkMJqC+WtQJSoACxBC4fAWf2JTEVIq8lgbrv46Xx2pGmgumFcQNGA4nPSHFGxqfxCVk4R/6jw3ztvGmeONWcmTVbyZ2uDbBwPzBEYKCPXeZEQZ2gDmRyLW7JCVvAi8GO12WQnCagrKrYOrlpFsRjBX4fQK8TFOT3NyXCDqhcPtOw4nhARAQnh+aHtBUKhRHx7iBH01r6YQrNURjKc9BZKVOQJ6zgC1p2HnsGsn5iNatq3nmeeMWDsdH8ysngdzFoj5+codNmx4sMl5naGqXCQQjW8AY2dxnpmLBTKAWR664R9N1b1oIBrgkBllEn2grlw8EI23BSO4ePQtRCVLexJANFwFg4abcASh8icDRINda/8BAAD//3aqfI8AAAAGSURBVAMAjnj+dDxR6pgAAAAASUVORK5CYII=",
  "icons/sync-syncing-v15-2-3.png": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFF0lEQVR4AexY3XEcNwwGJBVgdXDuIO5Ar0l8HqmBaCcVWBWcXIFTQXxKA5exlPGjSrA7UDqw36McjB+SC+6S+3M+z2g8x1mSIAAC+AjsHqUj+EHaAchTS+QhI4eMfKcTOJTW0MHSh2ZBt82G3l8+0O0ltb25Z/750N5dZXvLCG2aZ3R3+cDBEzzSAwCdA8ICskZnzN8kYB+ajjxTnrXYCxC6++0BTugzECw4eCg36rMZMDH4vmA+55uAWAldEhAuousUbiRklq4IlYiqNjN4zdA3ZmdnIALCSsjiiSN2CWFIV34idJUNkp1/mp8y3ozFTkBqIGb47aiGTG23H9V2RzpluROQUiamOKvqUMwUz5yZqt6AYDaQ/OUMJxkddJaRPTjLHo7f6+Q+vKROzwYC/HK25joRtILpVMkE+5DP+XQjALOA8I/ZvRmXYzSqHZmH7YoBu4UjWc2t6uQJ8W9RXdyVzALCP2ZnFqCPOJoUnkQpnXmy5GnoCZo1lWc1QYk/EwibGAxQhNJZr/Y4sSOL2lwBfBMoinrMUSBs7Fp/sPjO1NvNjHSqiWDm3h56O9VUFUgEwOW0AqunZNPHnE4VIclzAt8ASIdd2uQfyCIQzsBnDn7Vek7hKitfKcsGQSjdVjziG1yur6XD7mBgSusBCd/wWS9aciQIpSvjWEEoyYOBOebs8CJ7MuRJUuYmcY/IgNBd844IFp1KgmJjxSJfmZKJP6+VdAMuhYcdMAm50wS9YgI3rg7+e6a5H7u6JCCqSNSoWR3YytCDNSXMMtE1YZnBDpiuVndNZ3ItUlCVW3ICAv9v+z921DUII8nCQRDR2hAYc2lj1M9mvotx5fS+Zi2Q9DeFnbSaMjKzE1kqzyWTQMQtNTBm38ao25u39Jrf5Xeer0DofdN4ptAjplINiy7wF8kCg9Tk850WgejybA+6MusfT7EGJDiChtzfLwoEjmgVfPFUMsbs8PSl2MuEHYy3aZsJaEW3v1/bysYcjERo/HYs8YJ0Sx8DFS6N8qVK1T+wkXd5qYJC+AKuKQikLO1RbHsfV1zjryNPZ4J/ITS1KXQgwiScYtePFEssI0xAp1hgQtPAiN7GkokgBp3LH1GyJ5SzgkrAqY1CjUO7hkp7tENzQLwi+cUEessl02wgBBRiKO+LQtblA9gAg2oVo7DlCBWjoUgIM3Rm6cWyAqRsMOwtTKJP5wXBCGvaHrEuhjASsuBO3CPLgCCumbe3RxxUjQ0KedeI3IuR1eNjQP6Dq8iwd96rJ4kjhuXegdtkplXo9jtSdVWuVHGoiRUIXqzbL49qojktmhKmKgkxq7e7WgocWXTaeTEMt43qHHEtswIRAo7xQucwYJh3mpyf0f1et+QUc6atbFTboZoSEPxl/bcK9jGwHx/foMlJunVrGKopARFnuLxhs0JZr283+dCYGfKKalQG6Sbo6rYSk0NWf9C2E3weFxkQZT7iKYRi7TpQuR/6Hr20TKtRGaSXVca46hbxCn9epxtBD4ikCpd/iZf2A5Asq4m0qh1Uq1CmOlZ6SgjQ43kGAl7gy/UfntcDEoVcZqdwhC/i2uaxr5lpjY04plCXfwGuGFyue+9zFYjYwl/Xn5DfG+lbRDmBTyiCCX3s1EP1jlvSCyXyDfsGOY5TqZjSpkEgfsPxy/UVG3rBXQyO9iM+AL9f6GzvKw1s1A6+unmO/J8Y2T/UJwMZMvIUZAcgTyELPoZDRvxpPAX6h8nIVwAAAP//SGMDcQAAAAZJREFUAwC71Lp0v9PMDgAAAABJRU5ErkJggg==",
  "icons/sync-synced-v15-2-3.png": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFK0lEQVR4AexY23UcNwwFlRSw6kDqIOs04HSQdOBU4PF3jqS1lJx8ep0GrA6SDpIG7HEHcgd2Tn6VRS7Ax4AczmttxXt8djQkwQsQwCU5M1yd0BdyHYkc2kIeV+S4Ig80A8etNTaxTfvrWdPe/P70zfUdCsfSvLn5E/j3Y2P31X2yFWnaFyskrIkz398xsyR8ZhNj4sfAhaCSa9pNpre2S+VPQkQIMP/zHsFDYgyxuF3RR5f5RIjfQfzo+6OIyIyChGStBDgl60hAIgGkEHkgyOia+0x8iC+DLRb3JiKBZUZtROezB8RKgRRgzwFoYENeSdm1w+o07S/fZOCCzl5EaiSqMdmjaR2iEHCv7Wrmf1vx3SHzpb2IlCsxNxwPEJDxwlHU+/peTAT7+Y5re0Oy6RVJrwNtjzs4SVEvMRI4U1hMBH7P4qMM2ex/6ZWllq63iUn7nq1Vg+/QZmXRKXkREfmgRYcxRQ0bwZltHFuaezzUePhL/Vh/ERF2/Dg68wR8HbG57dCoDlfp4Vakv494bu4L7bxfHGfSxE05mFyR5vXzDR4+HCluvPcxjzqRYwY1XTdIAnQfVXx1mF7URtSwQSKRwM65K9K3lISh4csRkc1i2DLXuM6vUDJd2PHsD2SVCFbgPSsBUgrIkCYvFgutRJgsztGPLx9dmheg0JgcNmjQIwIScohbBQbdwDJO2e8sK1JuLCS268tbMVQyItD8SVDzosqINO31K+hxAETg5BcywF6cpBdlWLNgSuUsmP1iSVB3fRDRuowyJpbltT91dElEYLjCEeKJOAxpebHHIMBFoxxidIxJotiFTo0EEpXj/0rM1IcIKFZm/R2jR35GnphoGBR3IsL8dRt1IW7s5q2N4DXvfJPXpdkUiTh6NDaM5CyGndN7myUiRLvEtEwC47vbRJL9jXLOjqpkKFxzSYj5aGwYSHjsnOZp+7M8BkD8rUSa19dhS3lwTg0CKeZv68tzIveWKtcSEpXhOeSoe/p498T+flEimNErwoUWNWGHazNayXfGGrx8dLGmgswSEjLTNHUVRvL7JQ5RIujotoovFxAHFO6sEzA0jO/MGJkpEkVO3UzD9+BtcuEwQv5jI/aRiMj1wnGFjJdgqWTafFvKyjjnvovfiWBK9u0kWN+boPXCIWm7VVzoMN3rs1InUkTRblguRodNPDx4r/AWyZ6x7friL2PSI2F1Y3KME5OmSIjMxawHy0SEg05brQRA1tJICZjwMahoqEZGFajsSqiLcjBshu6+qXqomisR505u46DYeuvhgV7f1Z5M/l8QS4LI4Y/iPg0bA/2Re350ohPv5/6ZbwdqN4AXsLxF4ivRkvAJ+ToOmeNyjk30p0S2642edSJYtphtA427FzKWhAx0fi1EnC5uwGQAd4708KlECJdz7gc0xe1H+zqq8pmNqG1hoWenDgOindyTQqkKumAamqSNe7GH0053UyKCN80f3ago9YdFzVgbUqqYjPnLdUM+SjzupkREotpjR7YbytFifADFuR2ORj6RjIhAf7vdqbR+KQODfLJU/bkrh0cBq5EOqz0it3jww8rgBfDQDMJE9WclIHW9J3GRPQo9IsEDgcypc1/JQTBApdOyH8zKxppZWe3yicp7YtBDPsiOqT3Pg0TEzXb901ucnRxIYRJ4S9nplmnWZc2sXBnc4+lt3jnm55IDyqnsGA/n9SgRa4pD4DOQWsOZEvsf2/Ptt1cbm0tNnk2kNviQsCORQ1oNyeW4IjILh1S+mBX5DwAA///8o3AsAAAABklEQVQDAL9H7XQ6HpZjAAAAAElFTkSuQmCC"
};
for (const [file, base64] of Object.entries(icons)) fs.writeFileSync(file, Buffer.from(base64, "base64"));

const pkg = JSON.parse(read("package.json"));
pkg.version = VERSION;
write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
const lock = JSON.parse(read("package-lock.json"));
lock.version = VERSION;
if (lock.packages?.[""]) lock.packages[""].version = VERSION;
write("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

const version = JSON.parse(read("version.json"));
version.version = VERSION;
version.cacheVersion = CACHE_VERSION;
version.released = RELEASE_DATE;
version.name = "Sync Status Icons";
version.notes = "V15.2.3 uses the supplied status artwork and matching colors in the Cloud Sync toolbar: Synced is green, Syncing is orange, Needs sync uses its red attention icon, and Sync issue/Offline use the red unavailable icon. Finance Schema 12, Cloud Schema V3, records, calculations, conflict resolution, and the five-minute sync cadence are unchanged.";
write("version.json", `${JSON.stringify(version, null, 2)}\n`);

replaceExact("sync-config.js", 'const VERSION = "15.2.2";', 'const VERSION = "15.2.3";');
replaceExact("sync-config.js", 'const RELEASE_NAME = "Mobile UI & UX";', 'const RELEASE_NAME = "Sync Status Icons";');
replaceExact("sync-config.js", 'const RELEASE_DATE = "August 16, 2026";', 'const RELEASE_DATE = "August 17, 2026";');
replaceExact("sync-config.js",
  'const mapped = state === "syncing" ? "syncing" : (["sync-issue", "offline"].includes(state) ? "error" : (state === "synced" ? "success" : ""));',
  'const mapped = state === "syncing" ? "syncing" : (state === "needs-sync" ? "needs-sync" : (["sync-issue", "offline"].includes(state) ? "offline" : (state === "synced" ? "synced" : "")));'
);
const syncConfig = read("sync-config.js");
if (!syncConfig.includes("V15.2.3 · supplied Cloud Sync status artwork")) {
  const cssAnchor = "style.textContent = `\n";
  if (!syncConfig.includes(cssAnchor)) throw new Error("sync-config.js: enhancement style anchor not found");
  const statusCss = `      /* V15.2.3 · supplied Cloud Sync status artwork */\n      #cloudSyncStatusButton[data-sync-state=\"synced\"]{color:#43cf78!important}#cloudSyncStatusButton[data-sync-state=\"syncing\"]{color:#f5a623!important}#cloudSyncStatusButton[data-sync-state=\"needs-sync\"],#cloudSyncStatusButton[data-sync-state=\"sync-issue\"],#cloudSyncStatusButton[data-sync-state=\"offline\"]{color:#ff786e!important}\n      #cloudSyncStatusButton[data-sync-state] .cloud-sync-label,#cloudSyncStatusButton[data-sync-state] .toolbar-icon{color:inherit!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]{background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]::before,#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon] svg{display:none!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon=\"synced\"]{background-image:url(\"./icons/sync-synced-v15-2-3.png\")!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon=\"syncing\"]{background-image:url(\"./icons/sync-syncing-v15-2-3.png\")!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon=\"needs-sync\"]{background-image:url(\"./icons/sync-needs-sync-v15-2-3.png\")!important}\n      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon=\"offline\"]{background-image:url(\"./icons/sync-issue-offline-v15-2-3.png\")!important}\n`;
  write("sync-config.js", syncConfig.replace(cssAnchor, `${cssAnchor}${statusCss}`));
}

const stateCss = `/* V15.2.3 · Cloud Sync status colors match supplied icon artwork */
.cloud-sync-toolbar-button[data-sync-state="synced"] { color:#43cf78; border-color:color-mix(in srgb,#43cf78 48%,var(--line)); background:color-mix(in srgb,#43cf78 10%,var(--surface)); }
.cloud-sync-toolbar-button[data-sync-state="syncing"] { color:#f5a623; border-color:color-mix(in srgb,#f5a623 46%,var(--line)); background:color-mix(in srgb,#f5a623 9%,var(--surface)); }
.cloud-sync-toolbar-button[data-sync-state="needs-sync"],
.cloud-sync-toolbar-button[data-sync-state="sync-issue"],
.cloud-sync-toolbar-button[data-sync-state="offline"] { color:#ff786e; border-color:color-mix(in srgb,#ff786e 44%,var(--line)); background:color-mix(in srgb,#ff786e 9%,var(--surface)); }
.cloud-sync-toolbar-button[data-sync-state] .cloud-sync-label,
.cloud-sync-toolbar-button[data-sync-state] .toolbar-icon { color:inherit; }`;
appendOnce("app.css", "V15.2.3 · Cloud Sync status colors match supplied icon artwork", stateCss);

replaceExact("cloud-sync.js", 'if (label === "Offline") return "offline";', 'if (label === "Offline" || /^\\d+ pending$/.test(label)) return "offline";');
replaceExact("sw.js", 'const APP_VERSION = "15.2.2";', 'const APP_VERSION = "15.2.3";');
replaceExact("sw.js", 'const CACHE_VERSION = "finance-v15-20260817-phone-finance-r37";', `const CACHE_VERSION = "${CACHE_VERSION}";`);
const sw = read("sw.js");
if (!sw.includes("V15.2.3 sync status artwork")) {
  write("sw.js", sw.replace('self.__FINANCE_APP_VERSION = APP_VERSION;\n', 'self.__FINANCE_APP_VERSION = APP_VERSION;\n// V15.2.3 sync status artwork: supplied green/orange/red Cloud Sync icons and matching toolbar text colors.\n'));
}
replaceExact("index.html", '<title>My Finance Records · V15.2.2</title>', '<title>My Finance Records · V15.2.3</title>');

let readme = read("README.md");
readme = readme.replace("# My Finance Records · V15.2.2", "# My Finance Records · V15.2.3");
const readmeEntry = '- **V15.2.3 · Sync Status Icons** — Uses the supplied Cloud Sync artwork with matching state colors: Synced is green, Syncing is orange, Needs sync uses its red attention icon, and Sync issue/Offline use the red unavailable icon. The release also refreshes PWA delivery without changing finance logic, Cloud Schema V3, or the five-minute sync cadence.\n';
if (!readme.includes(readmeEntry.trim())) readme = readme.replace("## Recent updates\n\n", `## Recent updates\n\n${readmeEntry}`);
write("README.md", readme);

let changelog = read("CHANGELOG.md");
const changelogEntry = `## 15.2.3 · 2026-08-17\n- Replaced the Cloud Sync toolbar artwork with the supplied state icons and matching colors: green Synced, orange Syncing, red Needs sync attention, and red Sync issue/Offline unavailable.\n- Made the icon and text inherit the same state color on desktop and phone, including offline states that still have queued pending records.\n- Rotated the PWA cache to \`${CACHE_VERSION}\` and updated release metadata/README. Finance Schema 12, Cloud Schema V3, records, calculations, conflict resolution, and the five-minute sync cadence are unchanged.\n\n`;
if (!changelog.startsWith("## 15.2.3 · 2026-08-17")) changelog = `${changelogEntry}${changelog}`;
write("CHANGELOG.md", changelog);

let inspect = read("tests/inspect-project.mjs");
inspect = inspect.replace('if (pkg.version !== "15.2.2") fail(`Expected current package version 15.2.2, found ${pkg.version || "(missing)"}`);', 'if (pkg.version !== "15.2.3") fail(`Expected current package version 15.2.3, found ${pkg.version || "(missing)"}`);');
inspect = inspect.replace('if (!read("README.md").startsWith("# My Finance Records · V15.2.2")) fail("README release heading is not V15.2.2");', 'if (!read("README.md").startsWith("# My Finance Records · V15.2.3")) fail("README release heading is not V15.2.3");');
inspect = inspect.replace('if (!read("CHANGELOG.md").startsWith("## 15.2.2 · 2026-08-16")) fail("CHANGELOG latest entry is not V15.2.2");', 'if (!read("CHANGELOG.md").startsWith("## 15.2.3 · 2026-08-17")) fail("CHANGELOG latest entry is not V15.2.3");');
inspect = inspect.replace('console.log("Repository inspection passed: V15.2.2 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");', 'console.log("Repository inspection passed: V15.2.3 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");');
write("tests/inspect-project.mjs", inspect);

const browserTest = `import { test, expect } from "@playwright/test";\n\nconst states = [\n  ["synced", "sync-synced-v15-2-3.png", "rgb(67, 207, 120)"],\n  ["syncing", "sync-syncing-v15-2-3.png", "rgb(245, 166, 35)"],\n  ["needs-sync", "sync-needs-sync-v15-2-3.png", "rgb(255, 120, 110)"],\n  ["sync-issue", "sync-issue-offline-v15-2-3.png", "rgb(255, 120, 110)"],\n  ["offline", "sync-issue-offline-v15-2-3.png", "rgb(255, 120, 110)"]\n];\n\ntest("V15.2.3 Cloud Sync uses supplied state icons and matching colors", async ({ page }) => {\n  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });\n  const button = page.locator("#cloudSyncStatusButton");\n  await expect(button).toHaveCount(1);\n  for (const [state, icon, color] of states) {\n    await button.evaluate((element, value) => element.dataset.syncState = value, state);\n    await expect.poll(async () => button.locator(".toolbar-icon").getAttribute("data-uploaded-sync-icon")).toBe(state === "sync-issue" ? "offline" : state);\n    const styles = await button.evaluate(element => ({\n      buttonColor:getComputedStyle(element).color,\n      labelColor:getComputedStyle(element.querySelector(".cloud-sync-label")).color,\n      background:getComputedStyle(element.querySelector(".toolbar-icon")).backgroundImage\n    }));\n    expect(styles.buttonColor).toBe(color);\n    expect(styles.labelColor).toBe(color);\n    expect(styles.background).toContain(icon);\n  }\n});\n\ntest("V15.2.3 release metadata is visible", async ({ page }) => {\n  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });\n  await expect(page).toHaveTitle(/V15\\.2\\.3/);\n  await expect(page.locator("#buildBadge")).toContainText("V15.2.3");\n});\n`;
write("tests/sync-status-v15-2-3.spec.mjs", browserTest);

console.log("Applied V15.2.3 sync status icon release.");
