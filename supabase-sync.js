/* ============================================================
   supabase-sync.js — login Gmail + sincronización por CUENTA
   Carga el SDK UMD de Supabase por CDN (sin build).

   Modelo: un mismo mail de Google (auth.uid) puede tener VARIAS
   cuentas (planes), que se distinguen por NOMBRE (lo elige el
   usuario, p. ej. "Casa" y "Auto"). Cuotas e historial pertenecen
   a un plan puntual (plan_id).

   RLS: auth.uid() = user_id en las tres tablas -> cada usuario ve
   SOLO sus propios datos.
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
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        // forzar el selector de cuentas de Google (entre varios mails del mismo usuario)
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) console.error('loginGoogle:', error.message);
  }

  /* ---- Logout ---- */
  async function logout(){
    if (!ready) return;
    await sb.auth.signOut();
    user = null;
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: null } }));
  }

  /* ---- Listar las cuentas (planes) del usuario logueado ---- */
  async function listAccounts(){
    if (!ready || !user) return [];
    const { data, error } = await sb.from('planes')
      .select('id, nombre, objetivo, num_dep, dolar, updated_at')
      .order('updated_at', { ascending: false });
    if (error){ console.error('listAccounts:', error.message); return []; }
    // completar con el avance de cada cuenta (cuotas pagadas + ahorrado u$s)
    const planes = data || [];
    const out = [];
    for (const p of planes){
      const cq = await sb.from('cuotas').select('monto, paid').eq('plan_id', p.id);
      const cuotas = cq.data || [];
      const pagadas = cuotas.filter(c=>c.paid);
      const ahorradoUsd = pagadas.reduce((s,c)=> s + Number(c.monto||0), 0);
      out.push({ id:p.id, nombre:p.nombre, objetivo:p.objetivo, num_dep:p.num_dep, dolar:p.dolar,
        updated_at:p.updated_at, total:cuotas.length, pagadas:pagadas.length, ahorradoUsd });
    }
    return out;
  }

  /* ---- Borrar una cuenta (y su plan/historial por cascade) ---- */
  async function deleteAccount(planId){
    if (!ready || !user || !planId) return false;
    const { error } = await sb.from('planes').delete().eq('id', planId);
    if (error){ console.error('deleteAccount:', error.message); return false; }
    return true;
  }

  /* ---- Crear una cuenta nueva (plan) con un nombre ---- */
  async function createAccount(nombre){
    if (!ready || !user) return null;
    const { data, error } = await sb.from('planes').insert({
      user_id: user.id,
      nombre: nombre,
      objetivo: 100000, num_dep: 100, dolar: 1, tipo: 'progresivo',
      fecha_inicio: null, fecha_fin: null
    }).select('id, nombre').maybeSingle();
    if (error){ console.error('createAccount:', error.message); return null; }
    return data || null;
  }

  /* ---- Renombrar la cuenta actual (opcional) ---- */
  async function renameAccount(planId, nombre){
    if (!ready || !user || !planId) return false;
    const { error } = await sb.from('planes')
      .update({ nombre, updated_at: new Date().toISOString() })
      .eq('id', planId);
    if (error){ console.error('renameAccount:', error.message); return false; }
    return true;
  }

  /* ---- Bajar el estado de una cuenta (plan) específica ---- */
  async function downloadState(planId){
    if (!ready || !user || !planId) return null;
    const [{ data: plan }, { data: cuotas }, { data: hist }] = await Promise.all([
      sb.from('planes').select('*').eq('id', planId).maybeSingle(),
      sb.from('cuotas').select('*').eq('plan_id', planId).order('n'),
      sb.from('historial').select('*').eq('plan_id', planId).order('fecha', { ascending: false })
    ]);
    if (!plan) return null; // no existe
    return {
      id: plan.id, nombre: plan.nombre,
      objetivo: plan.objetivo, numDep: plan.num_dep, dolar: plan.dolar, tipo: plan.tipo || 'progresivo',
      fechaInicio: plan.fecha_inicio, fechaFin: plan.fecha_fin,
      cuotas: (cuotas || []).map(c => ({ n: c.n, monto: Number(c.monto), paid: c.paid })),
      historial: (hist || []).map(h => ({
        tipo: h.tipo, fecha: h.fecha, n: h.n, rate: h.rate,
        montoUsd: h.monto_usd, montoArs: h.monto_ars,
        restUsd: h.rest_usd, acumUsd: h.acum_usd, restArs: h.rest_ars, acumArs: h.acum_ars, texto: h.texto
      }))
    };
  }

  /* ---- Subir el estado de la cuenta actual (state.planId) ---- */
  async function uploadState(state){
    if (!ready || !user || !state.planId) return;
    const pid = state.planId;
    const uid = user.id;
    // actualizar el plan (upsert por id)
    const { error: e1 } = await sb.from('planes').update({
      objetivo: state.objetivo, num_dep: state.numDep, dolar: state.dolar, tipo: state.tipo,
      fecha_inicio: state.fechaInicio, fecha_fin: state.fechaFin, updated_at: new Date().toISOString()
    }).eq('id', pid);
    if (e1) console.error('update planes:', e1.message);
    // reemplazar cuotas del plan
    await sb.from('cuotas').delete().eq('plan_id', pid);
    const filas = state.cuotas.map(c => ({ user_id: uid, plan_id: pid, n: c.n, monto: c.monto, paid: c.paid }));
    const { error: e2 } = await sb.from('cuotas').insert(filas);
    if (e2) console.error('insert cuotas:', e2.message);
    // reemplazar historial del plan
    await sb.from('historial').delete().eq('plan_id', pid);
    const hist = state.historial.map(h => ({
      user_id: uid, plan_id: pid, tipo: h.tipo, fecha: h.fecha, n: h.n ?? null, rate: h.rate ?? null,
      monto_usd: h.montoUsd ?? null, monto_ars: h.montoArs ?? null,
      rest_usd: h.restUsd ?? null, acum_usd: h.acumUsd ?? null,
      rest_ars: h.restArs ?? null, acum_ars: h.acumArs ?? null, texto: h.texto ?? null
    }));
    const { error: e3 } = await sb.from('historial').insert(hist);
    if (e3) console.error('insert historial:', e3.message);
  }

  // API pública
  window.SupaSync = { init, isReady, getUser, isLoggedIn, loginGoogle, logout, listAccounts, createAccount, renameAccount, deleteAccount, uploadState, downloadState };
})();
