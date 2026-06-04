const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const f = "d:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/fix-scroll-architecture/nbi_project_dashboard.html";
  await page.goto("file:///" + f, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const shell = document.querySelector(".shell");
    const sidebar = document.getElementById("sidebarEl");
    const sn = document.getElementById("sidebarNav");
    const mc = document.getElementById("mainContent");
    if (shell) shell.style.display = "flex";
    if (sidebar) sidebar.style.display = "flex";
    if (sn) {
      let items = "";
      for (let i = 0; i < 40; i++) items += '<button class="sidebar__item"><span class="sidebar__item__label">Item ' + i + "</span></button>";
      sn.innerHTML = items;
    }
    if (mc) {
      mc.innerHTML = '<div class="tasks-view"><div style="flex-shrink:0;height:60px;background:#333">Filter</div><div class="tasks-layout"><div class="tasks-layout__main">' + Array(100).fill('<div style="height:40px;border-bottom:1px solid #444">Row</div>').join("") + '</div><div class="tasks-layout__detail" style="width:340px">' + Array(50).fill('<div style="height:40px;border-bottom:1px solid #444">Det</div>').join("") + "</div></div></div>";
    }
    void document.body.offsetHeight;
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() => {
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    const snap = (el) => {
      if (!el) return null;
      const s = cs(el);
      return { oh: el.offsetHeight, sh: el.scrollHeight, ch: el.clientHeight, ov: el.scrollHeight > el.clientHeight, h: s.height, oy: s.overflowY, fl: s.flex, d: s.display, ih: el.style.height || "(none)", ifl: el.style.flex || "(none)" };
    };
    return {
      vh: cs(document.documentElement).getPropertyValue("--vh-full"),
      shell: snap(document.querySelector(".shell")),
      sn: snap(document.getElementById("sidebarNav")),
      mc: snap(document.getElementById("mainContent")),
      tv: snap(document.querySelector(".tasks-view")),
      tl: snap(document.querySelector(".tasks-layout")),
      tm: snap(document.querySelector(".tasks-layout__main")),
      td: snap(document.querySelector(".tasks-layout__detail")),
    };
  });
  console.log("--vh-full: " + d.vh);
  console.log("Shell: h=" + d.shell.h + " oh=" + d.shell.oh);
  console.log("SidebarNav: h=" + d.sn.h + " sh=" + d.sn.sh + " ch=" + d.sn.ch + " overflows=" + d.sn.ov + " oy=" + d.sn.oy + " flex=" + d.sn.fl + " inlineH=" + d.sn.ih);
  console.log("MainContent: h=" + d.mc.h + " oy=" + d.mc.oy + " d=" + d.mc.d + " flex=" + d.mc.fl + " inlineH=" + d.mc.ih);
  console.log("TasksView: h=" + (d.tv ? d.tv.h : "NA") + " flex=" + (d.tv ? d.tv.fl : "NA"));
  console.log("TasksLayout: h=" + (d.tl ? d.tl.h : "NA") + " flex=" + (d.tl ? d.tl.fl : "NA"));
  console.log("TasksMain: h=" + (d.tm ? d.tm.h : "NA") + " sh=" + (d.tm ? d.tm.sh : "NA") + " overflows=" + (d.tm ? d.tm.ov : "NA") + " oy=" + (d.tm ? d.tm.oy : "NA") + " inlineH=" + (d.tm ? d.tm.ih : "NA"));
  console.log("TasksDetail: h=" + (d.td ? d.td.h : "NA") + " sh=" + (d.td ? d.td.sh : "NA") + " overflows=" + (d.td ? d.td.ov : "NA") + " oy=" + (d.td ? d.td.oy : "NA") + " inlineH=" + (d.td ? d.td.ih : "NA"));
  const issues = [];
  if (d.vh !== "100vh") issues.push("vh=" + d.vh);
  if (d.shell.oh < 1000) issues.push("shell too short: " + d.shell.oh);
  if (!d.sn.ov) issues.push("sidebar NOT scrollable");
  if (d.mc.oy !== "hidden") issues.push("mc oy=" + d.mc.oy + " (want hidden for tasks-view)");
  if (d.mc.d !== "flex") issues.push("mc display=" + d.mc.d + " (want flex)");
  if (d.tm && !d.tm.ov) issues.push("tasks-main NOT scrollable");
  if (d.td && !d.td.ov) issues.push("tasks-detail NOT scrollable");
  if (d.sn.ih !== "(none)") issues.push("sidebarNav has inline height!");
  if (d.mc.ih !== "(none)") issues.push("mainContent has inline height!");
  if (d.tm && d.tm.ih !== "(none)") issues.push("tasks-main has inline height!");
  console.log(issues.length === 0 ? "\nVERDICT: ALL CHECKS PASSED" : "\nISSUES: " + issues.join("; "));
  await browser.close();
  process.exit(issues.length);
})().catch(e => { console.error(e.message); process.exit(1); });
