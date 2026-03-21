(function () {
  var DATA = window.ONT_DATA || window.DEMO_MOCK;
  if (!DATA) return;

  var chartTrendInst;
  var chartActionInst;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function parseHash() {
    var raw = (location.hash || '#/dashboard').replace(/^#/, '');
    var q = raw.indexOf('?');
    var pathname = q >= 0 ? raw.slice(0, q) : raw;
    if (!pathname || pathname === '/') pathname = '/dashboard';
    if (pathname.charAt(0) !== '/') pathname = '/' + pathname;
    var search = q >= 0 ? raw.slice(q + 1) : '';
    return { path: pathname, params: new URLSearchParams(search) };
  }

  function path() {
    return parseHash().path;
  }

  function params() {
    return parseHash().params;
  }

  function layout(title, subtitle, inner) {
    return (
      '<div class="flex flex-wrap justify-between items-end gap-4 mb-8 ont-fade">' +
      '<div><h2 class="text-2xl font-bold text-[#0c1e3d] font-headline tracking-tight">' +
      esc(title) +
      '</h2>' +
      (subtitle
        ? '<p class="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-2xl">' +
          esc(subtitle) +
          '</p>'
        : '') +
      '</div>' +
      '<div class="text-right">' +
      '<span class="text-[11px] uppercase tracking-wider text-slate-400 font-medium">数据同步</span>' +
      '<p class="text-xs text-slate-500 mt-0.5 tabular-nums">' +
      esc(DATA.meta.refreshedAt) +
      '</p></div></div>' +
      inner
    );
  }

  function cardStat(k) {
    var Trend =
      k.trend === 'up'
        ? '<span class="text-emerald-600 text-xs font-semibold">↑ ' + esc(k.sub) + '</span>'
        : k.trend === 'down'
          ? '<span class="text-amber-600 text-xs font-semibold">↓ ' + esc(k.sub) + '</span>'
          : '<span class="text-slate-500 text-xs">' + esc(k.sub) + '</span>';
    return (
      '<div class="ont-card group relative bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-slate-200/90 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 transition-all duration-300">' +
      '<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2d6be4]/35 to-transparent rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>' +
      '<div class="flex justify-between items-start mb-4">' +
      '<span class="material-symbols-outlined text-[#2563eb] text-[30px]">' +
      esc(k.icon) +
      '</span>' +
      Trend +
      '</div>' +
      '<p class="text-[28px] font-bold text-[#0c1e3d] font-headline tracking-tight leading-none">' +
      esc(k.value) +
      '</p>' +
      '<p class="text-[11px] text-slate-500 mt-2 font-medium uppercase tracking-wider">' +
      esc(k.label) +
      '</p></div>'
    );
  }

  function getOTDetail(id) {
    var m = DATA.objectTypeDetails;
    if (id && m[id]) return m[id];
    return m['ot-cust'];
  }

  function getInstDetail(id) {
    var m = DATA.instanceDetails;
    if (id && m[id]) return m[id];
    var row = DATA.instances.find(function (x) {
      return x.id === id;
    });
    if (row) {
      return {
        id: row.id,
        typeId: row.typeId,
        type: row.type,
        name: row.name,
        props: {
          instanceId: row.id,
          displayName: row.name,
          objectType: row.type,
          namespace: row.ns,
          industry: row.industry,
          city: row.city,
          lastUpdated: row.updated,
        },
        relatedCounts: { contracts: '—', contacts: '—', opportunities: '—' },
      };
    }
    var first = DATA.instances[0];
    return m[first.id];
  }

  function getActionDetail(id) {
    var m = DATA.actionDetails;
    if (id && m[id]) return m[id];
    return m['act-approve'];
  }

  function renderDashboard() {
    var kpis = DATA.kpi.map(cardStat).join('');
    var act = DATA.activity
      .map(function (r) {
        return (
          '<tr class="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/90 transition-colors">' +
          '<td class="py-3.5 px-4 text-xs font-mono text-slate-500">' +
          esc(r.time) +
          '</td><td class="py-3.5 px-4 text-sm text-slate-800">' +
          esc(r.user) +
          '</td><td class="py-3.5 px-4 text-sm text-slate-700">' +
          esc(r.action) +
          '</td><td class="py-3.5 px-4 text-xs text-slate-500 font-mono">' +
          esc(r.scope) +
          '</td></tr>'
        );
      })
      .join('');
    return layout(
      '总览',
      '欢迎回来，' + esc(DATA.meta.tenant) + ' · 本体运行概览。',
      '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">' +
        kpis +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">' +
        '<div class="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">' +
        '<div class="flex justify-between items-center mb-4">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b]">实例规模 · 近 7 日（万）</h3>' +
        '<span class="text-[10px] text-slate-400">移动平均已平滑</span></div>' +
        '<div class="h-[260px]"><canvas id="chart-trend"></canvas></div></div>' +
        '<div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-4">动作执行量 · 近 7 日</h3>' +
        '<div class="h-[260px]"><canvas id="chart-actions"></canvas></div></div></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">' +
        '<div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b]">最近动态</h3>' +
        '<span class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">实时</span></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-left"><thead>' +
        '<tr class="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">' +
        '<th class="py-3 px-4 font-semibold">时间</th><th class="py-3 px-4 font-semibold">操作者</th>' +
        '<th class="py-3 px-4 font-semibold">事件</th><th class="py-3 px-4 font-semibold">命名空间</th></tr></thead><tbody>' +
        act +
        '</tbody></table></div></div>'
    );
  }

  function chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
        },
      },
    };
  }

  function initCharts() {
    if (typeof Chart === 'undefined') return;
    destroyCharts();
    var t = DATA.chartTrend;
    var ctx1 = document.getElementById('chart-trend');
    var ctx2 = document.getElementById('chart-actions');
    var gr = {
      type: 'linear',
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
      y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 11 }, color: '#64748b' } },
    };
    if (ctx1) {
      var g1 = ctx1.getContext('2d');
      var grad = g1.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(0, 'rgba(37,99,235,0.22)');
      grad.addColorStop(1, 'rgba(37,99,235,0)');
      chartTrendInst = new Chart(ctx1.getContext('2d'), {
        type: 'line',
        data: {
          labels: t.labels,
          datasets: [
            {
              label: '实例',
              data: t.instances,
              borderColor: '#2563eb',
              backgroundColor: grad,
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: '#2563eb',
              pointHoverBorderWidth: 2,
            },
          ],
        },
        options: Object.assign({}, chartDefaults(), { scales: gr }),
      });
    }
    if (ctx2) {
      var barCols = t.labels.map(function (_, i) {
        var a = 0.5 + (i / Math.max(1, t.labels.length - 1)) * 0.45;
        return 'rgba(26,58,107,' + a + ')';
      });
      chartActionInst = new Chart(ctx2.getContext('2d'), {
        type: 'bar',
        data: {
          labels: t.labels,
          datasets: [
            {
              label: '动作',
              data: t.actions,
              backgroundColor: barCols,
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: Object.assign({}, chartDefaults(), {
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
            y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { size: 11 }, color: '#64748b' } },
          },
        }),
      });
    }
  }

  function destroyCharts() {
    if (chartTrendInst) {
      chartTrendInst.destroy();
      chartTrendInst = null;
    }
    if (chartActionInst) {
      chartActionInst.destroy();
      chartActionInst = null;
    }
  }

  function renderObjectTypes() {
    var rows = DATA.objectTypes
      .map(function (o) {
        return (
          '<tr class="ont-ot-row border-b border-slate-100/80 hover:bg-slate-50/80 transition-colors" data-ns="' +
          esc(o.ns) +
          '">' +
          '<td class="py-3.5 px-4 text-sm font-semibold text-[#0c1e3d]">' +
          esc(o.name) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs font-mono text-slate-600">' +
          esc(o.ns) +
          '</td>' +
          '<td class="py-3.5 px-4 text-sm tabular-nums">' +
          esc(String(o.props)) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(o.iface.join(', ')) +
          '</td>' +
          '<td class="py-3.5 px-4 text-sm tabular-nums text-slate-800">' +
          esc(String(o.inst.toLocaleString())) +
          '</td>' +
          '<td class="py-3.5 px-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/10">' +
          esc(String(o.health)) +
          '%</span></td>' +
          '<td class="py-3.5 px-4 text-xs">' +
          '<a href="#/object-type-detail?id=' +
          esc(o.id) +
          '" class="font-semibold text-[#2563eb] hover:text-[#1d4ed8]">详情</a></td></tr>'
        );
      })
      .join('');
    var nsOpts = DATA.namespaces
      .map(function (n) {
        return '<option value="' + esc(n.name) + '">' + esc(n.title) + '</option>';
      })
      .join('');
    return layout(
      '对象类型',
      'Schema 定义 · 属性、接口与实例规模',
      '<div class="flex flex-wrap items-center gap-3 mb-6">' +
        '<a href="#/object-type-new" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c1e3d] text-white text-sm font-semibold shadow-lg shadow-slate-900/15 hover:bg-[#152a4a] transition-colors">' +
        '<span class="material-symbols-outlined text-[20px]">add</span> 新建类型</a>' +
        '<div class="flex items-center gap-2 ml-auto">' +
        '<label class="text-xs text-slate-500 font-medium">命名空间</label>' +
        '<select id="ont-filter-ns" class="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">' +
        '<option value="">全部</option>' +
        nsOpts +
        '</select></div></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"><div class="overflow-x-auto">' +
        '<table class="w-full text-left"><thead class="bg-slate-50/90 border-b border-slate-100"><tr>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">显示名</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">命名空间</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">属性数</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">接口</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">实例规模</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">质量</th>' +
        '<th class="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"></th>' +
        '</tr></thead><tbody id="ont-ot-tbody">' +
        rows +
        '</tbody></table></div></div>'
    );
  }

  function renderObjectTypeNew() {
    return layout(
      '新建对象类型',
      '向导 · 基本信息',
      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">' +
        '<div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-5">' +
        '<div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">显示名称</label>' +
        '<input class="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-inner bg-slate-50/50" readonly value="合约履约方"/></div>' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">API Name</label>' +
        '<input class="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono bg-slate-50/50" readonly value="ContractParty"/></div>' +
        '<div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">命名空间</label>' +
        '<input class="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono bg-slate-50/50" readonly value="business_core"/></div></div>' +
        '<div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">描述</label>' +
        '<textarea class="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm h-28 bg-slate-50/50" readonly>用于统一 B2B 签约主体与内部法人映射，支撑合同与授信联动。</textarea></div>' +
        '<div class="flex gap-3 pt-2">' +
        '<a href="#/object-types" class="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">取消</a>' +
        '<a href="#/object-type-detail?id=ot-cont" class="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-600">保存并配置属性</a></div></div>' +
        '<div class="bg-gradient-to-br from-[#0D1B3E] to-[#152a52] rounded-2xl p-8 text-white shadow-xl">' +
        '<p class="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold">校验策略</p>' +
        '<p class="text-sm text-white/90 leading-relaxed">命名规范、API Name 唯一性、与审批流绑定可在下一步配置。</p></div></div>'
    );
  }

  function renderObjectTypeDetail() {
    var id = params().get('id') || 'ot-cust';
    var d = getOTDetail(id);
    var props = d.properties
      .map(function (p) {
        return (
          '<tr class="border-b border-slate-100 last:border-0"><td class="py-3 px-4 text-sm font-mono font-medium text-slate-800">' +
          esc(p.name) +
          '</td><td class="py-3 px-4 text-xs text-slate-600">' +
          esc(p.type) +
          '</td><td class="py-3 px-4 text-center text-slate-500">' +
          (p.pk ? '●' : '—') +
          '</td><td class="py-3 px-4 text-xs text-slate-500">' +
          esc(p.lineage) +
          '</td></tr>'
        );
      })
      .join('');
    return layout(
      esc(d.name),
      esc(d.apiName) + ' · ' + esc(d.ns) + ' · ' + esc(d.version),
      '<div class="flex flex-wrap gap-4 mb-6">' +
        '<a href="#/object-types" class="text-sm font-semibold text-[#2563eb] hover:underline">← 返回列表</a>' +
        '<a href="#/instances?typeId=' +
        esc(d.id) +
        '" class="text-sm font-semibold text-[#2563eb] hover:underline">查看该类型实例 →</a>' +
        '<a href="#/graph" class="text-sm font-semibold text-slate-500 hover:text-[#2563eb]">图谱</a></div>' +
        '<p class="text-sm text-slate-600 mb-8 max-w-3xl leading-relaxed">' +
        esc(d.description) +
        '</p>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-4">属性</h3>' +
        '<table class="w-full text-left text-sm"><thead><tr class="text-[11px] uppercase tracking-wider text-slate-500">' +
        '<th class="pb-3 font-bold">标识</th><th class="pb-3 font-bold">类型</th><th class="pb-3 font-bold">主键</th><th class="pb-3 font-bold">血缘</th></tr></thead><tbody>' +
        props +
        '</tbody></table></div>' +
        '<div class="space-y-6">' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-3">接口</h3>' +
        '<div class="flex flex-wrap gap-2">' +
        d.interfaces
          .map(function (i) {
            return '<span class="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-mono font-medium text-slate-700 ring-1 ring-slate-200/80">' + esc(i) + '</span>';
          })
          .join('') +
        '</div></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-3">典型关联</h3><ul class="text-sm text-slate-600 space-y-2">' +
        d.linkTypes
          .map(function (l) {
            return '<li class="flex gap-2"><span class="text-slate-400">·</span><span>' + esc(l) + '</span></li>';
          })
          .join('') +
        '</ul></div></div></div>'
    );
  }

  function renderLinkTypes() {
    var rows = DATA.linkTypes
      .map(function (l) {
        return (
          '<tr class="border-b border-slate-100/80 hover:bg-slate-50/80"><td class="py-3.5 px-4 text-sm font-semibold text-slate-800">' +
          esc(l.name) +
          '</td><td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(l.from) +
          '</td><td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(l.to) +
          '</td><td class="py-3.5 px-4"><span class="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/80">' +
          esc(l.card) +
          '</span></td><td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(l.owner) +
          '</td></tr>'
        );
      })
      .join('');
    return layout(
      '关联类型',
      '基数、方向与语义约束',
      '<div class="mb-6"><a href="#/graph" class="inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:underline">打开图谱 <span class="material-symbols-outlined text-[16px]">arrow_forward</span></a></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"><table class="w-full text-left"><thead class="bg-slate-50/90 border-b border-slate-100">' +
        '<tr class="text-[11px] uppercase tracking-wider text-slate-500 font-bold"><th class="py-3 px-4">名称</th><th class="py-3 px-4">源</th><th class="py-3 px-4">目标</th>' +
        '<th class="py-3 px-4">基数</th><th class="py-3 px-4">负责人</th></tr></thead><tbody>' +
        rows +
        '</tbody></table></div>'
    );
  }

  function renderInstances() {
    var typeFilter = params().get('typeId') || '';
    var rows = DATA.instances
      .map(function (r) {
        var blob =
          esc(r.id + ' ' + r.name + ' ' + r.type + ' ' + r.industry + ' ' + r.city + ' ' + r.ns);
        return (
          '<tr class="ont-inst-row border-b border-slate-100/80 hover:bg-slate-50/90 transition-colors" data-type-id="' +
          esc(r.typeId) +
          '" data-search="' +
          blob +
          '">' +
          '<td class="py-3.5 px-4 text-xs font-mono font-semibold"><a href="#/instance-detail?id=' +
          esc(r.id) +
          '" class="text-[#2563eb] hover:underline">' +
          esc(r.id) +
          '</a></td>' +
          '<td class="py-3.5 px-4 text-sm text-slate-700">' +
          esc(r.type) +
          '</td>' +
          '<td class="py-3.5 px-4 text-sm font-medium text-slate-900">' +
          esc(r.name) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs">' +
          esc(r.tier) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(r.industry) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs text-slate-500 tabular-nums">' +
          esc(r.updated) +
          '</td></tr>'
        );
      })
      .join('');
    var typeOpts =
      '<option value="">全部类型</option>' +
      DATA.objectTypes
        .map(function (o) {
          return (
            '<option value="' +
            esc(o.id) +
            '"' +
            (typeFilter === o.id ? ' selected' : '') +
            '>' +
            esc(o.name) +
            '</option>'
          );
        })
        .join('');
    return layout(
      '对象实例',
      '跨命名空间检索与过滤',
      '<div class="flex flex-wrap items-center gap-3 mb-6">' +
        '<div class="relative flex-1 min-w-[200px] max-w-md">' +
        '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>' +
        '<input type="search" id="ont-inst-search" placeholder="搜索 ID、名称、行业…" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none" /></div>' +
        '<select id="ont-inst-type" class="text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none">' +
        typeOpts +
        '</select></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"><table class="w-full text-left"><thead class="bg-slate-50/90 border-b border-slate-100">' +
        '<tr class="text-[11px] uppercase tracking-wider text-slate-500 font-bold"><th class="py-3 px-4">实例 ID</th><th class="py-3 px-4">类型</th><th class="py-3 px-4">名称</th>' +
        '<th class="py-3 px-4">分层</th><th class="py-3 px-4">行业/域</th><th class="py-3 px-4">更新</th></tr></thead><tbody id="ont-inst-tbody">' +
        rows +
        '</tbody></table></div>'
    );
  }

  function renderInstanceDetail() {
    var id = params().get('id') || 'CUST-009281';
    var d = getInstDetail(id);
    var propRows = Object.keys(d.props)
      .map(function (k) {
        return (
          '<tr class="border-b border-slate-100 last:border-0"><td class="py-3 px-4 text-xs font-mono text-slate-500 font-medium">' +
          esc(k) +
          '</td><td class="py-3 px-4 text-sm text-slate-800">' +
          esc(d.props[k]) +
          '</td></tr>'
        );
      })
      .join('');
    var rc = d.relatedCounts || {};
    return layout(
      esc(d.name),
      esc(d.id) + ' · ' + esc(d.type),
      '<div class="flex flex-wrap gap-4 mb-6">' +
        '<a href="#/instances" class="text-sm font-semibold text-[#2563eb] hover:underline">← 实例列表</a>' +
        '<a href="#/object-type-detail?id=' +
        esc(d.typeId || 'ot-cust') +
        '" class="text-sm font-semibold text-[#2563eb] hover:underline">对象类型</a>' +
        '<a href="#/lineage?instanceId=' +
        esc(d.id) +
        '" class="text-sm font-semibold text-[#2563eb] hover:underline">数据血缘</a></div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">' +
        '<div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-4">属性</h3>' +
        '<table class="w-full text-left"><tbody>' +
        propRows +
        '</tbody></table></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm">' +
        '<h3 class="text-sm font-bold text-[#1a3a6b] mb-4">关联摘要</h3>' +
        '<ul class="text-sm space-y-3 text-slate-700">' +
        '<li class="flex justify-between"><span class="text-slate-500">框架协议</span><span class="font-bold tabular-nums">' +
        esc(String(rc.contracts != null ? rc.contracts : '—')) +
        '</span></li>' +
        '<li class="flex justify-between"><span class="text-slate-500">联系人</span><span class="font-bold tabular-nums">' +
        esc(String(rc.contacts != null ? rc.contacts : '—')) +
        '</span></li>' +
        '<li class="flex justify-between"><span class="text-slate-500">商机</span><span class="font-bold tabular-nums">' +
        esc(String(rc.opportunities != null ? rc.opportunities : '—')) +
        '</span></li></ul></div></div>'
    );
  }

  function renderSets() {
    var cards = DATA.objectSets
      .map(function (s) {
        return (
          '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow">' +
          '<div class="flex justify-between items-start mb-3">' +
          '<h3 class="font-bold text-[#0c1e3d] text-lg">' +
          esc(s.name) +
          '</h3>' +
          '<span class="text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">' +
          esc(s.type) +
          '</span></div>' +
          '<p class="text-xs text-slate-500 font-mono leading-relaxed mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100">' +
          esc(s.rule) +
          '</p>' +
          '<p class="text-3xl font-bold text-[#1a3a6b] font-headline">' +
          esc(String(s.count.toLocaleString())) +
          ' <span class="text-sm font-normal text-slate-500">成员</span></p>' +
          '<p class="text-xs text-slate-500 mt-3 font-medium">负责人 · ' +
          esc(s.owner) +
          '</p></div>'
        );
      })
      .join('');
    return layout('对象集合', '动态规则与快照', '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">' + cards + '</div>');
  }

  function renderActions() {
    var rows = DATA.actions
      .map(function (a) {
        var st =
          a.status === '健康'
            ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/10'
            : 'bg-amber-50 text-amber-900 ring-amber-600/10';
        return (
          '<tr class="border-b border-slate-100/80 hover:bg-slate-50/80">' +
          '<td class="py-3.5 px-4 text-xs font-mono text-slate-600">' +
          esc(a.id) +
          '</td><td class="py-3.5 px-4 text-sm font-semibold"><a href="#/action-detail?id=' +
          esc(a.id) +
          '" class="text-[#2563eb] hover:underline">' +
          esc(a.name) +
          '</a></td>' +
          '<td class="py-3.5 px-4 text-xs text-slate-600">' +
          esc(a.type) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs tabular-nums font-medium">' +
          esc(String(a.runs24h)) +
          '</td>' +
          '<td class="py-3.5 px-4 text-xs font-mono text-slate-600">' +
          esc(a.p95) +
          '</td>' +
          '<td class="py-3.5 px-4"><span class="text-xs px-2.5 py-1 rounded-lg font-semibold ring-1 ' +
          st +
          '">' +
          esc(a.status) +
          '</span></td></tr>'
        );
      })
      .join('');
    return layout(
      '动作',
      '有状态操作与执行观测',
      '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"><table class="w-full text-left"><thead class="bg-slate-50/90 border-b border-slate-100">' +
        '<tr class="text-[11px] uppercase tracking-wider text-slate-500 font-bold"><th class="py-3 px-4">标识</th><th class="py-3 px-4">名称</th><th class="py-3 px-4">类型</th>' +
        '<th class="py-3 px-4">24h</th><th class="py-3 px-4">P95</th><th class="py-3 px-4">状态</th></tr></thead><tbody>' +
        rows +
        '</tbody></table></div>'
    );
  }

  function renderActionDetail() {
    var id = params().get('id') || 'act-approve';
    var d = getActionDetail(id);
    var pres = d.preconditions.map(function (p) {
      return '<li class="text-sm text-slate-600 mb-2 leading-relaxed pl-1">· ' + esc(p) + '</li>';
    });
    var ins = d.inputs
      .map(function (i) {
        return (
          '<tr class="border-b border-slate-100 last:border-0"><td class="py-2.5 px-3 text-xs font-mono font-medium">' +
          esc(i.name) +
          '</td><td class="py-2.5 px-3 text-xs">' +
          esc(i.type) +
          '</td><td class="py-2.5 px-3 text-xs text-slate-500">' +
          (i.required ? '必填' : '可选') +
          '</td></tr>'
        );
      })
      .join('');
    var hooks = d.webhooks
      .map(function (w) {
        return '<li class="text-xs font-mono text-slate-600 break-all">' + esc(w) + '</li>';
      })
      .join('');
    return layout(
      esc(d.name),
      esc(d.version) + ' · 规则与集成',
      '<div class="mb-6"><a href="#/actions" class="text-sm font-semibold text-[#2563eb] hover:underline">← 返回列表</a></div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-5 gap-6">' +
        '<div class="xl:col-span-2 space-y-6">' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm"><h3 class="text-sm font-bold text-[#1a3a6b] mb-3">入参</h3>' +
        '<table class="w-full text-left"><tbody>' +
        ins +
        '</tbody></table></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm"><h3 class="text-sm font-bold text-[#1a3a6b] mb-2">前置条件</h3><ul class="list-none pl-0">' +
        pres.join('') +
        '</ul></div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm"><h3 class="text-sm font-bold text-[#1a3a6b] mb-3">Webhook</h3><ul class="space-y-2">' +
        hooks +
        '</ul></div></div>' +
        '<div class="xl:col-span-3 bg-[#0f172a] rounded-2xl p-6 shadow-2xl border border-slate-800 ring-1 ring-white/5">' +
        '<div class="flex justify-between items-center mb-4">' +
        '<span class="text-[11px] text-slate-500 font-mono font-semibold">rule.dsl</span>' +
        '<span class="text-[10px] text-slate-600 font-medium">只读</span></div>' +
        '<pre class="text-[13px] leading-relaxed text-emerald-400/95 font-mono whitespace-pre-wrap overflow-x-auto selection:bg-emerald-500/30">' +
        esc(d.logic) +
        '</pre></div></div>'
    );
  }

  function renderGraph() {
    return layout(
      '图谱',
      '类型与实例子图 · 点击节点跳转',
      '<div class="mb-6 flex flex-wrap gap-4">' +
        '<a href="#/link-types" class="text-sm font-semibold text-[#2563eb] hover:underline">关联类型</a>' +
        '<a href="#/object-type-detail?id=ot-cust" class="text-sm font-semibold text-slate-600 hover:text-[#2563eb]">企业客户 · 类型</a></div>' +
        '<div class="bg-[#0c1222] rounded-2xl p-6 md:p-10 min-h-[440px] relative overflow-hidden border border-slate-800 shadow-2xl">' +
        '<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.12),transparent_50%)] pointer-events-none"></div>' +
        '<svg viewBox="0 0 820 380" class="w-full h-auto relative z-10 max-h-[480px]">' +
        '<defs>' +
        '<filter id="ng" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#0f2847"/></linearGradient>' +
        '</defs>' +
        '<line x1="410" y1="118" x2="548" y2="118" stroke="#3b82f6" stroke-width="2" opacity="0.55"/>' +
        '<line x1="210" y1="248" x2="380" y2="198" stroke="#64748b" stroke-width="1.5" opacity="0.45"/>' +
        '<line x1="380" y1="198" x2="540" y2="228" stroke="#64748b" stroke-width="1.5" opacity="0.45"/>' +
        '<a href="#/object-type-detail?id=ot-cust"><g filter="url(#ng)"><rect x="290" y="72" width="180" height="92" rx="14" fill="url(#lg1)" stroke="#3b82f6" stroke-width="1.5"/>' +
        '<text x="380" y="128" text-anchor="middle" fill="#f8fafc" font-size="15" font-family="system-ui" font-weight="600">企业客户 · 类型</text></g></a>' +
        '<a href="#/object-type-detail?id=ot-cont"><g><rect x="520" y="72" width="180" height="92" rx="14" fill="#1e293b" stroke="#6366f1" stroke-width="1.5"/>' +
        '<text x="610" y="128" text-anchor="middle" fill="#e2e8f0" font-size="14" font-family="system-ui" font-weight="600">框架协议 · 类型</text></g></a>' +
        '<a href="#/instance-detail?id=CUST-009281"><g><rect x="100" y="210" width="200" height="80" rx="12" fill="#020617" stroke="#38bdf8" stroke-width="1.5"/>' +
        '<text x="200" y="256" text-anchor="middle" fill="#f1f5f9" font-size="13" font-family="system-ui" font-weight="500">云岭基金 · 实例</text></g></a>' +
        '<a href="#/instance-detail?id=CUST-009044"><g><rect x="430" y="210" width="200" height="80" rx="12" fill="#020617" stroke="#a78bfa" stroke-width="1.5"/>' +
        '<text x="530" y="256" text-anchor="middle" fill="#f1f5f9" font-size="13" font-family="system-ui" font-weight="500">江涵精密 · 实例</text></g></a>' +
        '</svg>' +
        '<p class="text-center text-slate-500 text-xs mt-6 relative z-10">支持力导向布局与大规模渐进渲染</p></div>'
    );
  }

  function renderVersions() {
    var items = DATA.versions
      .map(function (v) {
        return (
          '<div class="relative pl-10 pb-10 border-l-2 border-blue-500/25 last:border-l-transparent last:pb-2">' +
          '<div class="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-[#2563eb] ring-4 ring-white shadow"></div>' +
          '<p class="font-mono text-sm font-bold text-[#0c1e3d]">' +
          esc(v.tag) +
          '</p>' +
          '<p class="text-xs text-slate-500 mt-1.5">' +
          esc(v.date) +
          ' · ' +
          esc(v.author) +
          '</p>' +
          '<p class="text-sm text-slate-600 mt-3 leading-relaxed">' +
          esc(v.notes) +
          '</p></div>'
        );
      })
      .join('');
    return layout('版本', '语义版本与变更记录', '<div class="bg-white rounded-2xl border border-slate-200/90 p-8 md:p-10 shadow-sm">' + items + '</div>');
  }

  function renderLineage() {
    var iid = params().get('instanceId');
    var banner = iid
      ? '<div class="mb-6 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-900 font-medium">当前聚焦实例 · <span class="font-mono">' +
        esc(iid) +
        '</span> · 字段血缘链路</div>'
      : '';
    var steps = DATA.lineageFlow
      .map(function (s, i) {
        var arrow = i < DATA.lineageFlow.length - 1 ? '<span class="text-[#2563eb] text-2xl mx-1 md:mx-3 shrink-0">→</span>' : '';
        return (
          '<div class="flex items-stretch flex-wrap md:flex-nowrap gap-2">' +
          '<div class="flex-1 min-w-[140px] bg-white border border-slate-200/90 rounded-xl px-4 py-4 shadow-sm">' +
          '<p class="text-xs font-bold text-[#1a3a6b] leading-snug">' +
          esc(s.step) +
          '</p>' +
          '<p class="text-[10px] text-slate-500 mt-2 font-medium">' +
          esc(s.system) +
          ' · ' +
          esc(s.latency) +
          '</p>' +
          '<p class="text-xs text-emerald-700 mt-2 font-semibold tabular-nums">质量 ' +
          esc(String(s.quality)) +
          '%</p></div>' +
          arrow +
          '</div>'
        );
      })
      .join('');
    return layout(
      '数据血缘',
      '跨系统加工链路',
      banner +
        '<div class="flex flex-col md:flex-row md:flex-wrap md:items-center gap-y-4 gap-x-0 mb-8 overflow-x-auto pb-2">' +
        steps +
        '</div>' +
        '<p class="text-sm text-slate-500 leading-relaxed max-w-3xl">自 ERP 至本体黄金实例的全链路可追溯，满足内控与审计留痕要求。</p>'
    );
  }

  function renderRbac() {
    var M = DATA.rbac;
    var head =
      '<th class="py-3 px-3 text-xs text-left bg-slate-50 border-b border-slate-200 font-bold text-slate-600">角色 \\ 资源</th>' +
      M.resources
        .map(function (r) {
          return '<th class="py-3 px-2 text-[10px] text-center bg-slate-50 border-b border-slate-200 font-bold text-slate-500 max-w-[5rem] leading-tight">' + esc(r) + '</th>';
        })
        .join('');
    var body = M.roles
      .map(function (role, ri) {
        var cells = M.matrix[ri]
          .map(function (ok) {
            return (
              '<td class="py-3 px-2 text-center border-b border-slate-100">' +
              (ok
                ? '<span class="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">✓</span>'
                : '<span class="text-slate-200">—</span>') +
              '</td>'
            );
          })
          .join('');
        return (
          '<tr class="hover:bg-slate-50/50"><td class="py-3 px-3 text-xs font-semibold border-b border-slate-100 text-slate-800 whitespace-nowrap">' +
          esc(role) +
          '</td>' +
          cells +
          '</tr>'
        );
      })
      .join('');
    return layout(
      '权限',
      '角色与资源矩阵 · 可扩展属性级策略',
      '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-x-auto shadow-sm"><table class="w-full border-collapse text-sm min-w-[640px]">' +
        '<thead><tr>' +
        head +
        '</tr></thead><tbody>' +
        body +
        '</tbody></table></div>' +
        '<p class="text-xs text-slate-500 mt-6 leading-relaxed max-w-3xl">对象类型、实例、动作与血缘等能力可独立授权，支撑最小权限原则。</p>'
    );
  }

  function renderIntegration() {
    var cards = DATA.integrations
      .map(function (x) {
        var ok = x.status === '运行中';
        var badge = ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15' : 'bg-amber-50 text-amber-900 ring-amber-600/15';
        return (
          '<div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow">' +
          '<div class="flex justify-between items-start mb-3 gap-2">' +
          '<h3 class="text-sm font-bold text-[#0c1e3d] leading-snug">' +
          esc(x.name) +
          '</h3>' +
          '<span class="text-[10px] px-2.5 py-1 rounded-lg font-bold ring-1 shrink-0 ' +
          badge +
          '">' +
          esc(x.status) +
          '</span></div>' +
          '<p class="text-xs text-slate-500 font-medium">最近同步 · ' +
          esc(x.last) +
          '</p>' +
          '<p class="text-xl font-bold text-[#1a3a6b] mt-3 font-headline">' +
          esc(x.throughput) +
          '</p>' +
          '<p class="text-[10px] text-slate-500 mt-2 font-medium">' +
          esc(x.owner) +
          '</p></div>'
        );
      })
      .join('');
    var log = DATA.webhookLog
      .map(function (w) {
        var col = w.code >= 200 && w.code < 300 ? 'text-emerald-700' : 'text-red-600';
        return (
          '<tr class="border-b border-slate-100/80 hover:bg-slate-50/80"><td class="py-2.5 px-4 text-xs font-mono text-slate-600">' +
          esc(w.ts) +
          '</td><td class="py-2.5 px-4 text-xs text-slate-800">' +
          esc(w.event) +
          '</td><td class="py-2.5 px-4 text-xs font-mono text-slate-600">' +
          esc(w.dest) +
          '</td><td class="py-2.5 px-4 text-xs font-bold ' +
          col +
          '">' +
          esc(String(w.code)) +
          '</td></tr>'
        );
      })
      .join('');
    return layout(
      '集成',
      '连接器与事件投递',
      '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">' +
        cards +
        '</div>' +
        '<div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">' +
        '<div class="px-6 py-4 border-b border-slate-100 font-bold text-sm text-[#1a3a6b] bg-slate-50/50">Webhook 投递</div>' +
        '<table class="w-full text-left text-sm"><thead class="bg-slate-50/90"><tr class="text-[11px] uppercase tracking-wider text-slate-500 font-bold">' +
        '<th class="py-3 px-4">时间</th><th class="py-3 px-4">事件</th><th class="py-3 px-4">目标</th><th class="py-3 px-4">HTTP</th>' +
        '</tr></thead><tbody>' +
        log +
        '</tbody></table></div>'
    );
  }

  var routes = {
    '/dashboard': renderDashboard,
    '/object-types': renderObjectTypes,
    '/object-type-new': renderObjectTypeNew,
    '/object-type-detail': renderObjectTypeDetail,
    '/link-types': renderLinkTypes,
    '/instances': renderInstances,
    '/instance-detail': renderInstanceDetail,
    '/sets': renderSets,
    '/actions': renderActions,
    '/action-detail': renderActionDetail,
    '/graph': renderGraph,
    '/versions': renderVersions,
    '/lineage': renderLineage,
    '/rbac': renderRbac,
    '/integration': renderIntegration,
  };

  function routeGroupActive(route, p) {
    if (route === p) return true;
    if (route === '/object-types' && (p === '/object-type-new' || p === '/object-type-detail')) return true;
    if (route === '/instances' && p === '/instance-detail') return true;
    if (route === '/actions' && p === '/action-detail') return true;
    return false;
  }

  function wireFilters() {
    var ns = document.getElementById('ont-filter-ns');
    if (ns) {
      ns.onchange = function () {
        var v = ns.value;
        document.querySelectorAll('.ont-ot-row').forEach(function (row) {
          var ok = !v || row.getAttribute('data-ns') === v;
          row.classList.toggle('hidden', !ok);
        });
      };
    }
    var search = document.getElementById('ont-inst-search');
    var typeSel = document.getElementById('ont-inst-type');
    function applyInstFilter() {
      var q = (search && search.value.toLowerCase().trim()) || '';
      var tid = (typeSel && typeSel.value) || '';
      document.querySelectorAll('.ont-inst-row').forEach(function (row) {
        var matchType = !tid || row.getAttribute('data-type-id') === tid;
        var blob = (row.getAttribute('data-search') || '').toLowerCase();
        var matchQ = !q || blob.indexOf(q) >= 0;
        row.classList.toggle('hidden', !(matchType && matchQ));
      });
    }
    if (search) search.oninput = applyInstFilter;
    if (typeSel) typeSel.onchange = applyInstFilter;
    applyInstFilter();
  }

  function renderMain() {
    destroyCharts();
    var parsed = parseHash();
    var p = parsed.path;
    var fn = routes[p] || routes['/dashboard'];
    var root = document.getElementById('app-view-root');
    if (!root) return;
    root.innerHTML = fn();
    document.querySelectorAll('a.app-nav-link').forEach(function (a) {
      var r = a.getAttribute('data-route');
      if (!r) return;
      var on = routeGroupActive(r, p);
      var icon = a.querySelector('.material-symbols-outlined');
      if (on) {
        a.classList.add('active-nav');
        a.classList.remove('text-white/60');
        a.classList.add('text-white');
        if (icon) icon.setAttribute('style', "font-variation-settings: 'FILL' 1");
      } else {
        a.classList.remove('active-nav');
        a.classList.add('text-white/60');
        a.classList.remove('text-white');
        if (icon) icon.setAttribute('style', "font-variation-settings: 'FILL' 0");
      }
    });
    if (p === '/dashboard') requestAnimationFrame(initCharts);
    wireFilters();

    var title = breadcrumbTitle(p, parsed.params);
    window.dispatchEvent(new CustomEvent('approute', { detail: { path: p, params: parsed.params, title: title } }));
  }

  function breadcrumbTitle(p, prm) {
    var map = {
      '/dashboard': '总览',
      '/object-types': '对象类型',
      '/object-type-new': '新建对象类型',
      '/link-types': '关联类型',
      '/instances': '对象实例',
      '/sets': '对象集合',
      '/actions': '动作',
      '/graph': '图谱',
      '/versions': '版本',
      '/lineage': '数据血缘',
      '/rbac': '权限',
      '/integration': '集成',
    };
    if (p === '/object-type-detail') {
      var ot = getOTDetail(prm.get('id'));
      return '对象类型 · ' + ot.name;
    }
    if (p === '/instance-detail') {
      var ins = getInstDetail(prm.get('id'));
      return '实例 · ' + ins.name;
    }
    if (p === '/action-detail') {
      var ac = getActionDetail(prm.get('id'));
      return '动作 · ' + ac.name;
    }
    return map[p] || '总览';
  }

  window.addEventListener('hashchange', renderMain);
  window.addEventListener('DOMContentLoaded', renderMain);
})();
