/* ============================================================
   supabase-sync.js — login Gmail + sincronización por usuario
   Carga el SDK UMD de Supabase por CDN (sin build).
   Cada usuario logueado ve SOLO sus propios datos (RLS).
   ============================================================ */
(function(){
  "use strict";

  // Cargar config (incrustada por index.html o fetch a config.json)
  const CFG = window.__SUPABASE_CFG__ || null;

  // Estado: ¿hay Supabase configurado?
  let sb = null, ready = false, user = null;

  function init(url, anonKey){
    if (!url || !anonKey || url.includes('XXXXX')) { ready = false; return; }
    if (window.supabase) {
      sb = window.supabase.createClient(url, anonKey);
      ready = true;
      // escuchar cambios de sesión
      sb.auth.onAuthStateChange((_event, session) => {
        user = session?.user || null;
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { user } }));
      });
      // sesión existente al cargar
      sb.auth.getSession().then(({ data }) => {
        user = data.session?.user || null;
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { user } }));
      });
    }
  }

  function isReady(){ return ready; }
  function getUser(){ return user; }
  function isLoggedIn(){ return !!user; }

  /* ---- Login con Gmail ---- */
  async function loginGoogle(){
    if (!ready) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    if (error) console.error('loginGoogle:', error.message);
  }

  /* ---- Logout ---- */
  async function logout(){
    if (!ready) return;
    await sb.auth.signOut();
    user = null;
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: null } }));
  }

  /* ---- Subir el estado local a Supabase (por usuario) ---- */
  async function uploadState(state){
    if (!ready || !user) return;
    const uid = user.id;
    // 1) upsert plan
    const { error: e1 } = await sb.from('planes').upsert({
      user_id: uid, objetivo: state.objetivo, num_dep: state.numDep, dolar: state.dolar,
      fecha_inicio: state.fechaInicio, fecha_fin: state.fechaFin, updated_at: new Date().toISOString()
    });
    if (e1) console.error('upsert planes:', e1.message);
    // 2) borrar cuotas viejas y reinsertar
    await sb.from('cuotas').delete().eq('user_id', uid);
    const filas = state.cuotas.map(c => ({ user_id: uid, n: c.n, monto: c.monto, paid: c.paid }));
    const { error: e2 } = await sb.from('cuotas').insert(filas);
    if (e2) console.error('insert cuotas:', e2.message);
    // 3) historial: solo sync incremental (insertar los que no estén)
    //    simplificación: reinsertar todo (el historial es chico)
    await sb.from('historial').delete().eq('user_id', uid);
    const hist = state.historial.map(h => ({
      user_id: uid, tipo: h.tipo, fecha: h.fecha, n: h.n ?? null, rate: h.rate ?? null,
      monto_usd: h.montoUsd ?? null, monto_ars: h.montoArs ?? null,
      rest_usd: h.restUsd ?? null, acum_usd: h.acumUsd ?? null,
      rest_ars: h.restArs ?? null, acum_ars: h.acumArs ?? null, texto: h.texto ?? null
    }));
    const { error: e3 } = await sb.from('historial').insert(hist);
    if (e3) console.error('insert historial:', e3.message);
  }

  /* ---- Bajar el estado de Supabase al local ---- */
  async function downloadState(){
    if (!ready || !user) return null;
    const uid = user.id;
    const [{ data: plan }, { data: cuotas }, { data: hist }] = await Promise.all([
      sb.from('planes').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('cuotas').select('*').eq('user_id', uid).order('n'),
      sb.from('historial').select('*').eq('user_id', uid).order('fecha', { ascending: false })
    ]);
    if (!plan) return null; // usuario nuevo sin datos
    return {
      objetivo: plan.objetivo, numDep: plan.num_dep, dolar: plan.dolar,
      fechaInicio: plan.fecha_inicio, fechaFin: plan.fecha_fin,
      cuotas: (cuotas || []).map(c => ({ n: c.n, monto: Number(c.monto), paid: c.paid })),
      historial: (hist || []).map(h => ({
        tipo: h.tipo, fecha: h.fecha, n: h.n, rate: h.rate,
        montoUsd: h.monto_usd, montoArs: h.monto_ars,
        restUsd: h.rest_usd, acumUsd: h.acum_usd, restArs: h.rest_ars, acumArs: h.acum_ars, texto: h.texto
      }))
    };
  }

  // API pública
  window.SupaSync = { init, isReady, getUser, isLoggedIn, loginGoogle, logout, uploadState, downloadState };
})();
