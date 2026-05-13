const usuarioLogueado =
    JSON.parse(
        localStorage.getItem("usuario")
    );

if (!usuarioLogueado) {

    document.getElementById(
        "loginScreen"
    ).style.display = "flex";

    document.getElementById(
        "crmApp"
    ).style.display = "none";

} else {

    document.getElementById(
        "loginScreen"
    ).style.display = "none";

    document.getElementById(
        "crmApp"
    ).style.display = "block";
}

async function cargarClientesGlobal() {

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    clientesGlobal = await res.json();
}

// 🔒 LOGIN
if (!localStorage.getItem("auth")) location.href = "login.html";

// ================= NAV =================
function cargarSeccion(sec) {

    document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
    document.getElementById("btn" + capitalizar(sec)).classList.add("active");

    tituloPagina.innerText = capitalizar(sec);
    document.querySelector(".breadcrumb").innerText = "Dashboard / " + capitalizar(sec);

    const btnNuevo = document.getElementById("btnNuevo");

    if (sec === "dashboard") {
        contenido.innerHTML = dashboardSection.innerHTML;
        btnNuevo.style.display = "none";
        setTimeout(cargarDashboard, 100);
    }

    if (sec === "clientes") {
        contenido.innerHTML = clientesSection.innerHTML;
        btnNuevo.style.display = "none";
        setTimeout(cargarClientes, 100);
    }

    if (sec === "leads") {
        contenido.innerHTML = leadsSection.innerHTML;
        setTimeout(cargarLeads, 100);
    }

    if (sec === "correo") {
        contenido.innerHTML = correoSection.innerHTML;

        setTimeout(() => {
            cargarCorreos();
        }, 100);
    }

    if (sec === "proyectos") {
        contenido.innerHTML = proyectosSection.innerHTML;

        // 🔥 IMPORTANTE (esperar a que cargue el DOM)
        setTimeout(() => {
            cargarProyectos();
        }, 100);
    }

    if (sec === "facturacion") {
        contenido.innerHTML = facturacionSection.innerHTML;
        setTimeout(cargarFacturas, 100);
    }

    if (sec === "incidencias") {
        contenido.innerHTML = incidenciasSection.innerHTML;
        setTimeout(cargarIncidencias, 100);
    }

    if (sec === "ajustes") {
        contenido.innerHTML = ajustesSection.innerHTML;
        setTimeout(cargarAjustes, 100);
    }

    if (sec === "clientes") {
        cargarClientes();
    }
    if (sec === "agenda") {

        contenido.innerHTML =
            agendaSection.innerHTML;

        setTimeout(() => {

            cargarEventos();

            cargarSolicitudes();

        }, 100);
    }


}

// ================= DASHBOARD =================
async function cargarDashboard() {

    const resClientes = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    const clientes = await resClientes.json();

    const leads = JSON.parse(localStorage.getItem("leads")) || [];
    const facturas = JSON.parse(localStorage.getItem("facturas")) || [];

    // 🔥 LIMPIAR VALORES (soporta "-77 €", "77€", "77,50 €", etc.)
    const toNumber = (v) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === "number") return v;

        const limpio = v.toString()
            .replace("€", "")
            .replace(/\s/g, "")
            .replace(",", ".");

        const n = parseFloat(limpio);
        return isNaN(n) ? 0 : n;
    };

    // 🔥 OBTENER IMPORTES REALES
    const valores = facturas.map(f => toNumber(f.importe));

    // 💰 INGRESOS (solo positivos)
    const ingresos = valores
        .filter(v => v > 0)
        .reduce((acc, v) => acc + v, 0);

    // 💸 GASTOS (negativos → convertidos a positivo)
    const gastos = valores
        .filter(v => v < 0)
        .reduce((acc, v) => acc + Math.abs(v), 0);

    // 📊 BALANCE
    const balance = ingresos - gastos;

    // 🔥 INCIDENCIAS
    const resInc = await fetch("https://crm-backend-production-7e25.up.railway.app/incidencias");
    const incidencias = await resInc.json();

    const abiertas = incidencias.filter(i => {
        const estado = i.estado?.toLowerCase().trim();
        return estado === "abierta" || estado === "proceso";
    }).length;

    // ================= KPIs =================

    document.getElementById("totalClientes").innerText = clientes.length;
    document.getElementById("totalLeads").innerText = leads.length;

    document.getElementById("totalIngresos").innerText = "€ " + ingresos.toFixed(2);
    document.getElementById("gastos").innerText = "€ " + gastos.toFixed(2);

    const balanceEl = document.getElementById("balance");
    balanceEl.innerText = "€ " + balance.toFixed(2);
    balanceEl.style.color = balance >= 0 ? "#16a34a" : "#dc2626";

    document.getElementById("totalIncidencias").innerText = abiertas;

    // ================= ACTIVIDAD =================

    document.getElementById("actividad").innerHTML = `
        <p>👥 Clientes: ${clientes.length}</p>
        <p>📩 Leads: ${leads.length}</p>
        <p>💰 Ingresos: €${ingresos.toFixed(2)}</p>
        <p>💸 Gastos: €${gastos.toFixed(2)}</p>
        <p>📊 Balance: €${balance.toFixed(2)}</p>
        <p>⚠️ Incidencias abiertas: ${abiertas}</p>
        <p>🕒 ${new Date().toLocaleTimeString()}</p>
    `;

    generarGrafica(facturas);
}

// 📊 GRÁFICA
function generarGrafica(facturas) {

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const ingresosMes = new Array(12).fill(0);
    const gastosMes = new Array(12).fill(0);

    facturas.forEach(f => {

        if (!f.fecha) return;

        const fecha = new Date(f.fecha.split("/").reverse().join("-"));
        const mes = fecha.getMonth();

        const base = Number(f.importe) || 0;
        const iva = Number(f.iva ?? 0.21);
        const total = base * (1 + iva);

        if (f.tipo === "ingreso") {
            ingresosMes[mes] += total;
        } else {
            gastosMes[mes] += total;
        }
    });

    const ctx = document.getElementById("graficaClientes");

    if (window.grafica) window.grafica.destroy();

    window.grafica = new Chart(ctx, {
        type: "bar",
        data: {
            labels: meses,
            datasets: [
                {
                    label: "Ingresos",
                    data: ingresosMes
                },
                {
                    label: "Gastos",
                    data: gastosMes
                }
            ]
        }
    });
}

// ================= CLIENTES =================
async function cargarClientes() {
    try {
        const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes?ts=" + Date.now());
        const clientes = await res.json();

        clientesGlobal = clientes; // 🔥 clave para todo

        pintar(clientes); // 🔥 pinta tabla

    } catch (error) {
        console.error("Error cargando clientes:", error);
    }
}

function pintar(clientes) {

    const tbody = document.querySelector("#tablaClientes tbody");

    if (!tbody) {
        console.error("❌ No existe #tablaClientes tbody");
        return;
    }

    tbody.innerHTML = "";

    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:30px;">
                👥 No hay clientes
            </td>
        </tr>
        `;
        return;
    }

    let html = "";

    clientes.forEach((c, index) => {

        html += `
<tr>
    <td>${index + 1}</td>

    <td onclick="verCliente('${c.id}')" style="cursor:pointer; font-weight:600;">
        ${c.nombre || "-"}
    </td>

    <td>${c.email || "-"}</td>
    <td>${c.telefono || "-"}</td>
    <td>${c.empresa || "-"}</td>
    <td>${c.cif || "-"}</td>
    <td>${c.direccion || "-"}</td>

    <td class="acciones">

        <button class="btn-view" onclick="verCliente(${c.id})">
            <i class="fas fa-eye"></i>
        </button>

        <button class="btn-edit" onclick="editar('${c.id}')">
            <i class="fas fa-pen"></i>
        </button>

        <button class="btn-delete" onclick="eliminar('${c.id}')">
            <i class="fas fa-trash"></i>
        </button>

    </td>
</tr>
`;
    });

    tbody.innerHTML = html;
}

// 🔥 MUY IMPORTANTE
cargarClientes();

// EDITAR
async function editar(idCliente) {

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    const clientes = await res.json();

    const cliente = clientes.find(c => c.id == idCliente);
    if (!cliente) return;

    abrirModal();
    tituloModal.innerText = "Editar Cliente";

    id.value = cliente.id;
    nombre.value = cliente.nombre || "";
    email.value = cliente.email || "";
    telefono.value = cliente.telefono || "";
    empresa.value = cliente.empresa || "";

    document.getElementById("cif").value = cliente.cif || "";
    document.getElementById("direccion").value = cliente.direccion || "";
}

// GUARDAR
async function guardar() {

    const idVal = id.value;

    // 🔥 VALIDACIONES
    const nombreVal = nombre.value.trim();
    const emailVal = email.value.trim();

    if (!nombreVal) {
        mostrarToast("El nombre es obligatorio");
        return;
    }

    if (!emailVal) {
        mostrarToast("El email es obligatorio");
        return;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regexEmail.test(emailVal)) {
        mostrarToast("Email no válido");
        return;
    }

    await cargarClientes(); // aseguramos lista actualizada

    const duplicado = clientesGlobal.find(c =>
        c.email?.toLowerCase() === emailVal.toLowerCase()
    );

    // 👉 solo bloquea si estás CREANDO (no editando)
    if (duplicado && !idVal) {
        mostrarToast("Ya existe un cliente con ese email");
        return;
    }

    // 🔥 OBJETO COMPLETO (AQUÍ ESTABA EL FALLO)
    const cliente = {
        nombre: nombreVal,
        email: emailVal,
        telefono: telefono.value?.trim() || "",
        empresa: empresa.value?.trim() || "",
        cif: document.getElementById("cif").value?.trim() || "",           // ✅ AÑADIDO
        direccion: document.getElementById("direccion").value?.trim() || "" // ✅ AÑADIDO
    };

    // 🧪 DEBUG (puedes quitarlo luego)
    console.log("Cliente enviado:", cliente);

    try {

        if (idVal) {
            await fetch(`https://crm-backend-production-7e25.up.railway.app/clientes/${idVal}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cliente)
            });
            toast("Cliente actualizado");

        } else {
            await fetch("https://crm-backend-production-7e25.up.railway.app/clientes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cliente)
            });
            toast("Cliente creado");
        }

        await cargarClientes();
        cerrarModal();

    } catch (e) {
        console.error(e);
        toast("Error al guardar");
    }
}

// ELIMINAR
async function eliminar(idCliente) {

    if (!confirm("¿Eliminar cliente?")) return;

    await fetch(`https://crm-backend-production-7e25.up.railway.app/clientes/${idCliente}`, {
        method: "DELETE"
    });

    toast("Cliente eliminado");
    cargarClientes();
}

// BUSCADOR
document.addEventListener("input", async (e) => {

    if (e.target.id !== "buscador") return;

    const texto = e.target.value.toLowerCase();

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    const clientes = await res.json();

    const filtrados = clientes.filter(c =>
        c.nombre?.toLowerCase().includes(texto) ||
        c.email?.toLowerCase().includes(texto) ||
        c.empresa?.toLowerCase().includes(texto)
    );

    pintar(filtrados);
});

async function buscarClientes() {
    const texto = buscador.value.toLowerCase();
    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    const clientes = await res.json();

    pintar(clientes.filter(c =>
        c.nombre?.toLowerCase().includes(texto) ||
        c.email?.toLowerCase().includes(texto) ||
        c.empresa?.toLowerCase().includes(texto)
    ));
}

// ================= LEADS =================
function cargarLeads() {
    const data = JSON.parse(localStorage.getItem("leads")) || [];
    pintarLeads(data);
}
function cargarLeads() {
    const data = JSON.parse(localStorage.getItem("leads")) || [];
    pintarLeads(data);
}

function pintarLeads(data) {

    const tbody = document.querySelector("#tablaLeads tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `
    <tr>
      <td colspan="6" style="padding:40px; text-align:center; color:#94a3b8;">
        <div style="font-size:30px;">📭</div>
        <div>No tienes leads todavía</div>
        <div style="font-size:12px;">Empieza captando nuevos clientes</div>
      </td>
    </tr>
  `;
        return;
    }
    data.forEach((l, i) => {

        const clase =
            l.estado === "nuevo" ? "estado-nuevo" :
                l.estado === "contactado" ? "estado-contactado" :
                    "estado-cerrado";

        tbody.innerHTML += `
<tr>
<td>${i + 1}</td>
<td>${l.nombre}</td>
<td>${l.email}</td>
<td>${l.empresa || '-'}</td>
<td><span class="badge-estado ${clase}">${l.estado}</span></td>
<td>
<button onclick="cambiarEstado(${i})">🔄</button>
<button onclick="eliminarLead(${i})"><i class="fas fa-trash"></i></button>
</td>
</tr>`;
    });
}

function cambiarEstado(i) {
    const estados = ["nuevo", "contactado", "cerrado"];
    let actual = leads[i].estado;
    leads[i].estado = estados[(estados.indexOf(actual) + 1) % 3];
    localStorage.setItem("leads", JSON.stringify(leads));
    cargarLeads();
}

function eliminarLead(i) {
    if (!confirm("Eliminar lead?")) return;
    leads.splice(i, 1);
    localStorage.setItem("leads", JSON.stringify(leads));
    cargarLeads();
}

// ================= MODAL =================
function abrirModal() {
    modalCliente.style.display = "flex";
    limpiarFormulario();
}

function cerrarModal() {
    modalCliente.style.display = "none";
}

function limpiarFormulario() {
    id.value = "";
    nombre.value = "";
    email.value = "";
    telefono.value = "";
    empresa.value = "";
}

// ================= UTILS =================
function logout() {
    localStorage.clear();
    location.href = "login.html";
}

function capitalizar(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function toast(msg) {

    const t = document.getElementById("toast");

    t.innerText = msg;
    t.style.display = "block";
    t.style.opacity = "1";

    setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.style.display = "none", 300);
    }, 2000);
}

// INIT
cargarSeccion("dashboard");
cargarSolicitudes();

// cerrar modal
window.onclick = e => {
    if (e.target === modalCliente) cerrarModal();
};

function abrirModalLead() {
    document.getElementById("modalLead").style.display = "flex";
}

function cerrarModalLead() {
    document.getElementById("modalLead").style.display = "none";
}

function guardarLead() {

    const nombre = document.getElementById("leadNombre").value;
    const email = document.getElementById("leadEmail").value;
    const empresa = document.getElementById("leadEmpresa").value;

    if (!nombre.trim()) {
        mostrarToast("El nombre es obligatorio");
        return;
    }

    const leads = JSON.parse(localStorage.getItem("leads")) || [];

    const nuevo = {
        nombre,
        email,
        empresa,
        estado: "nuevo"
    };

    leads.push(nuevo);

    localStorage.setItem("leads", JSON.stringify(leads));

    cerrarModalLead();

    // 🔥 CLAVE
    cargarLeads();
}

// ================= CORREO =================

let correos = JSON.parse(localStorage.getItem("correos")) || [];



// PINTAR LISTA
function pintarCorreos(data) {

    const lista = document.getElementById("listaCorreos");
    lista.innerHTML = "";

    if (data.length === 0) {
        lista.innerHTML = `
        <div style="text-align:center; padding:40px; color:#94a3b8;">
            <div style="font-size:30px;">📭</div>
            <p>No tienes correos todavía</p>
            <small>Empieza enviando tu primer email</small>
        </div>
        `;
        return;
    }

    data.forEach((c, i) => {
        lista.innerHTML += `
        <div class="correo-item" onclick="verCorreo(${i})">
            <strong>${c.asunto}</strong>
            <br>
            <small>${c.destinatario}</small>
        </div>
        `;
    });
}

// VER CORREO
function verCorreo(i) {

    // 🔥 quitar activos
    document.querySelectorAll(".correo-item").forEach(el => {
        el.classList.remove("active");
    });

    // 🔥 activar seleccionado
    const items = document.querySelectorAll(".correo-item");
    if (items[i]) items[i].classList.add("active");

    const c = window.correos[i];

    document.getElementById("detalleCorreo").innerHTML = `
        <h2 style="margin-top:0;">${c.asunto}</h2>

        <div style="margin:10px 0; color:#64748b;">
            <strong>De:</strong> ${c.de}<br>
            <strong>Fecha:</strong> ${c.fecha}
        </div>

        <hr style="margin:15px 0;">

        <div style="line-height:1.6; white-space:pre-wrap;">
            ${c.contenido || "(Sin contenido)"}
        </div>
    `;
}


function abrirModalCorreo() {
    modalCorreo.style.display = "flex";
}

function cerrarModalCorreo() {
    modalCorreo.style.display = "none";
}

async function enviarCorreo() {

    const data = {
        para: correoPara.value,
        asunto: correoAsunto.value,
        mensaje: correoMensaje.value
    };

    try {

        await fetch("https://crm-backend-production-7e25.up.railway.app/correo/enviar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        // 🔥 guardar también en local
        correos.push({
            destinatario: data.para,
            asunto: data.asunto,
            mensaje: data.mensaje
        });

        localStorage.setItem("correos", JSON.stringify(correos));

        cerrarModalCorreo();
        cargarCorreos();

        toast("Correo enviado 📧");

    } catch (e) {
        console.error(e);
        toast("Error al enviar correo");
    }
}

// ================= PROYECTOS =================


// CARGAR
async function cargarProyectos() {

    try {

        const res = await fetch("https://crm-backend-production-7e25.up.railway.app/proyectos");

        if (!res.ok) {
            throw new Error("Error cargando proyectos");
        }

        proyectos = await res.json();

        console.log("📦 PROYECTOS MYSQL:", proyectos);

        pintarProyectos();

    } catch (error) {

        console.error("❌ Error cargando proyectos:", error);
    }
}

// PINTAR
function pintarProyectos() {

    const colPendiente = document.getElementById("colPendiente");
    const colCurso = document.getElementById("colCurso");
    const colFinalizado = document.getElementById("colFinalizado");

    if (!colPendiente || !colCurso || !colFinalizado) {
        console.error("Columnas no encontradas ❌");
        return;
    }

    colPendiente.innerHTML = "";
    colCurso.innerHTML = "";
    colFinalizado.innerHTML = "";

    if (proyectos.length === 0) {
        colPendiente.innerHTML = `
            <p style="color:#94a3b8;">No hay proyectos</p>
        `;
        return;
    }

    proyectos.forEach((p, i) => {

        const card = document.createElement("div");
        card.className = "kanban-card";

        const cliente = clientesGlobal.find(c => c.id == p.clienteId);

        // 🔥 FORMATEAR FECHA BONITA
        let fechaFormateada = "Sin fecha";
        if (p.fecha) {
            try {
                fechaFormateada = new Date(p.fecha).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
            } catch (e) {
                fechaFormateada = "Sin fecha";
            }
        }

        card.innerHTML = `
            <div class="card-title">${p.titulo}</div>

            <div style="font-size:12px; color:#64748b;">
                👤 ${cliente ? cliente.nombre : "Sin cliente"}
            </div>

            <div style="font-size:12px; color:#64748b; margin-top:2px;">
                📅 ${fechaFormateada}
            </div>

            <div class="card-desc">${p.descripcion || ""}</div>

            <select onchange="cambiarEstadoProyecto(${i}, this.value)" style="
                margin-top:8px;
                width:100%;
                padding:6px;
                border-radius:6px;
                border:1px solid #ccc;
            ">
                <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>🟡 Pendiente</option>
                <option value="curso" ${p.estado === "curso" ? "selected" : ""}>🔵 En curso</option>
                <option value="finalizado" ${p.estado === "finalizado" ? "selected" : ""}>🟢 Finalizado</option>
            </select>

            <div class="card-actions">
                <button class="btn-edit" onclick="editarProyecto(${i})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-delete" onclick="eliminarProyecto(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        if (p.estado === "pendiente") {
            colPendiente.appendChild(card);
        } else if (p.estado === "curso") {
            colCurso.appendChild(card);
        } else {
            colFinalizado.appendChild(card);
        }

    });
}

// DRAG & DROP
function activarDrop() {

    document.querySelectorAll(".kanban-col").forEach(col => {

        col.ondragover = e => e.preventDefault();

        col.ondrop = e => {
            const index = e.dataTransfer.getData("index");
            const estado = col.dataset.estado;

            proyectos[index].estado = estado;

            fetch(`https://crm-backend-production-7e25.up.railway.app/proyectos/${proyectos[index].id}`, {

    method: "PUT",

    headers: {
        "Content-Type": "application/json"
    },

    body: JSON.stringify(proyectos[index])

})
.then(res => {

    if (!res.ok) {
        throw new Error("Error actualizando");
    }

    console.log("✅ Estado actualizado MYSQL");

})
.catch(err => {

    console.error(
        "❌ Error actualizando proyecto:",
        err
    );
});

            localStorage.setItem("proyectos", JSON.stringify(proyectos));
            pintarProyectos();
        };
    });
}

// ================= CRUD =================

function abrirModalProyecto() {

    modalProyecto.style.display = "flex";
    limpiarProyecto();

    cargarClientesSelectProyecto(); // 🔥 clave
}

function cerrarModalProyecto() {
    modalProyecto.style.display = "none";
}

function limpiarProyecto() {
    proyectoId.value = "";
    proyectoTitulo.value = "";
    proyectoDesc.value = "";
}

async function guardarProyecto() {

    const data = {

        titulo: proyectoTitulo.value,

        descripcion: proyectoDesc.value,

        clienteId: proyectoCliente.value,

        estado: "pendiente",

        fecha: new Date().toISOString()
    };

    if (!data.titulo.trim()) {

        mostrarToast("Título obligatorio");

        return;
    }

    try {

        await fetch("https://crm-backend-production-7e25.up.railway.app/proyectos", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        });

        cerrarModalProyecto();

        cargarProyectos();

        toast("Proyecto guardado");

    } catch (e) {

        console.error(e);

        mostrarToast("Error guardando proyecto");
    }
}

function editarProyecto(i) {

    abrirModalProyecto();

    proyectoId.value = i;
    proyectoTitulo.value = proyectos[i].titulo;
    proyectoDesc.value = proyectos[i].descripcion;
}

async function eliminarProyecto(id) {

    if (!confirm("¿Eliminar proyecto?")) return;

    try {

        await fetch(`https://crm-backend-production-7e25.up.railway.app/proyectos/${id}`, {

            method: "DELETE"
        });

        cargarProyectos();

    } catch (e) {

        console.error(e);
    }
}

async function cambiarEstadoProyecto(
    index,
    nuevoEstado
) {

    try {

        proyectos[index].estado =
            nuevoEstado;

        // 💾 MYSQL
        const res = await fetch(

            `https://crm-backend-production-7e25.up.railway.app/proyectos/${proyectos[index].id}`,

            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(
                    proyectos[index]
                )
            }
        );

        if (!res.ok) {

            throw new Error(
                "Error actualizando proyecto"
            );
        }

        // 💾 LOCAL
        localStorage.setItem(
            "proyectos",
            JSON.stringify(proyectos)
        );

        pintarProyectos();

        console.log(
            "✅ Estado proyecto actualizado"
        );

    } catch (e) {

        console.error(
            "❌ Error actualizando proyecto:",
            e
        );

        mostrarToast(
            "❌ Error actualizando proyecto",
            "error"
        );
    }
}

// ================= FACTURACIÓN =================

let facturas = JSON.parse(localStorage.getItem("facturas")) || [];
let facturaEditandoIndex = null;

// CARGAR
async function cargarFacturas() {

    try {

        const res = await fetch(
            "https://crm-backend-production-7e25.up.railway.app/facturas"
        );

        if (!res.ok) {

            throw new Error(
                "Error cargando facturas"
            );
        }

        facturas = await res.json();

        // 🔥 guardar copia local
        localStorage.setItem(
            "facturas",
            JSON.stringify(facturas)
        );

        pintarFacturas();

        console.log(
            "✅ Facturas cargadas desde MySQL"
        );

    } catch (error) {

        console.error(
            "❌ Error cargando facturas:",
            error
        );

        // 🔥 fallback localStorage
        facturas = JSON.parse(
            localStorage.getItem("facturas")
        ) || [];

        pintarFacturas();
    }
}

// PINTAR
facturas = JSON.parse(localStorage.getItem("facturas")) || [];

function pintarFacturas() {

    const tbody = document.querySelector("#tablaFacturas tbody");

    if (!tbody) {
        console.error("❌ No existe #tablaFacturas tbody");
        return;
    }

    tbody.innerHTML = "";

    if (!facturas || facturas.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="12" style="text-align:center; padding:30px;">
                📭 No hay facturas
            </td>
        </tr>`;
        return;
    }

    let html = "";

    facturas.forEach((f, i) => {

        // 🔥 CÁLCULOS SEGUROS
        const base = Number(f.importe) || 0;
        const ivaPorcentaje = Number(f.iva ?? 0.21);
        const iva = base * ivaPorcentaje;
        const total = base + iva;
        const pagado = Number(f.pagado) || 0;
        const pendiente = total - pagado;

        // 🔥 ESTADO CORRECTO
        const estado =
            pagado === 0 ? "pendiente" :
                pagado < total ? "parcial" :
                    "pagado";

        const clase =
            estado === "pendiente" ? "estado-pendiente" :
                estado === "parcial" ? "estado-parcial" :
                    "estado-pagado";

        html += `
<tr>

    <td>${f.cliente || '-'}</td>

    <td>${f.empresa || '-'}</td>

    <td style="max-width:250px;">
        ${f.concepto || '-'}
    </td>

    <td>${f.fecha || '-'}</td>

    <td>${base.toFixed(2)} €</td>

    <td>
        <span class="badge">
            ${(ivaPorcentaje * 100).toFixed(0)}%
        </span>
    </td>

    <td>${total.toFixed(2)} €</td>

    <td>${pagado.toFixed(2)} €</td>

    <td>${pendiente.toFixed(2)} €</td>

    <td>${f.tipo || '-'}</td>

    <td>
        <span class="badge-estado ${clase}">
            ${estado}
        </span>
    </td>

    <td class="acciones">
        <button class="btn-edit" onclick="editarFactura(${i})">
            <i class="fas fa-pen"></i>
        </button>

        <button class="btn-edit" onclick="sumarPago(${i})">
            <i class="fas fa-euro-sign"></i>
        </button>

        <button class="btn-view" onclick="descargarPDF(${i})">
            <i class="fas fa-file-alt"></i>
        </button>

        <button class="btn-delete" onclick="eliminarFactura(${f.id})">
            <i class="fas fa-trash"></i>
        </button>
    </td>

</tr>
`;
    });

    tbody.innerHTML = html;
}


function abrirModalFactura() {

    // 🔥 LIMPIAR TODOS LOS CAMPOS
    facturaCliente.value = "";
    facturaEmpresa.value = "";
    facturaConcepto.value = "";
    facturaImporte.value = "";

    document.getElementById("facturaIVA").value = "0.21"; // valor por defecto

    // 🔥 RESET EDIT MODE
    facturaEditandoIndex = null;

    // 🔥 ABRIR MODAL
    modalFactura.style.display = "flex";
}

function cerrarModalFactura() {

    modalFactura.style.display = "none";

    facturaCliente.value = "";
    facturaEmpresa.value = "";
    facturaConcepto.value = "";
    facturaImporte.value = "";
    document.getElementById("facturaIVA").value = "0.21";

    facturaEditandoIndex = null;
}

async function guardarFactura() {

    const clienteVal =
        facturaCliente.value.trim();

    const empresaVal =
        facturaEmpresa.value.trim();

    const conceptoVal =
        facturaConcepto.value.trim();

    const importeVal =
        parseFloat(facturaImporte.value);

    const ivaVal =
        parseFloat(
            document.getElementById(
                "facturaIVA"
            ).value
        );

    // =========================
    // 🔥 VALIDACIONES
    // =========================

    if (!clienteVal) {

        mostrarToast(
            "El cliente es obligatorio"
        );

        return;
    }

    if (
        isNaN(importeVal) ||
        importeVal === 0
    ) {

        mostrarToast(
            "El importe debe ser válido"
        );

        return;
    }

    // =========================
    // 🔥 OBJETO FACTURA
    // =========================

    const facturaBase = {

        cliente: clienteVal,

        empresa: empresaVal,

        concepto: conceptoVal,

        importe: importeVal,

        iva: ivaVal,

        pagado: 0,

        fecha: new Date()
            .toISOString()
            .split("T")[0],

        tipo: "único"
    };

    try {

        // =========================
        // ✏️ EDITAR FACTURA
        // =========================

        if (
            facturaEditandoIndex !== null
        ) {

            const facturaEditando =
                facturas[
                facturaEditandoIndex
                ];

            const facturaActualizada = {

                ...facturaEditando,

                ...facturaBase
            };

            // 🔥 MYSQL UPDATE
            const res = await fetch(
                `https://crm-backend-production-7e25.up.railway.app/facturas/${facturaEditando.id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        facturaActualizada
                    )
                }
            );

            if (!res.ok) {

                throw new Error(
                    "Error actualizando factura"
                );
            }

            facturas[
                facturaEditandoIndex
            ] = facturaActualizada;

            facturaEditandoIndex = null;

            console.log(
                "✅ FACTURA ACTUALIZADA MYSQL"
            );

        } else {

            // =========================
            // 🆕 NUEVA FACTURA
            // =========================

            const res = await fetch(
                "https://crm-backend-production-7e25.up.railway.app/facturas",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        cliente:
                            clienteVal,

                        empresa:
                            empresaVal,

                        concepto:
                            conceptoVal,

                        importe:
                            importeVal,

                        iva:
                            ivaVal,

                        pagado: 0,

                        fecha: new Date()
                            .toISOString()
                            .split("T")[0],

                        tipo: "único"
                    })
                }
            );

            if (!res.ok) {

                throw new Error(
                    "Error guardando factura"
                );
            }

            const facturaMysql =
                await res.json();

            facturas.push(
                facturaMysql
            );

            console.log(
                "✅ FACTURA MYSQL OK"
            );
        }

        // =========================
        // 💾 LOCALSTORAGE
        // =========================

        localStorage.setItem(
            "facturas",
            JSON.stringify(facturas)
        );

        // =========================
        // 🔥 RECARGAR
        // =========================

        cerrarModalFactura();

        await cargarFacturas();

        cargarDashboard();

        mostrarToast(
            "✅ Factura guardada correctamente"
        );

    } catch (e) {

        console.error(
            "❌ Error guardando factura MYSQL:",
            e
        );

        mostrarToast(
            "❌ Error guardando factura"
        );
    }
}

async function eliminarFactura(id) {

    console.log("🗑️ ID FACTURA:", id);

    if (!confirm("¿Eliminar factura?")) return;

    try {

        const res = await fetch(
            `https://crm-backend-production-7e25.up.railway.app/facturas/${id}`,
            {
                method: "DELETE"
            }
        );

        console.log("STATUS:", res.status);

        if (!res.ok) {

            throw new Error(
                "Error eliminando factura"
            );
        }

        await cargarFacturas();

        mostrarToast(
            "✅ Factura eliminada"
        );

    } catch (error) {

        console.error(
            "❌ Error eliminando factura:",
            error
        );

        mostrarToast(
            "❌ Error eliminando factura"
        );
    }
}

function descargarPDF(i) {

    const f = facturas[i];

    const base = Number(f.importe) || 0;
    const ivaPorcentaje = f.iva ?? 0.21;
    const iva = base * ivaPorcentaje;
    const total = base + iva;
    const pagado = Number(f.pagado) || 0;
    const pendiente = total - pagado;

    const html = `
<div class="factura">

    <!-- HEADER -->
    <div class="factura-header">

        <div class="logo">
            <img src="LOGO_AQUI" />
        </div>

        <div class="factura-info">
            <h1>FACTURA</h1>
            <p><b>Nº:</b> ${i + 1}</p>
            <p><b>Fecha:</b> ${f.fecha}</p>
        </div>

    </div>

    <!-- EMPRESA / CLIENTE -->
    <div class="factura-bloques">

    <!-- EMISOR -->
    <div class="bloque">
        <span class="titulo">Emisor</span>

        <p class="nombre">PosicionUp</p>

        <p><b>CIF:</b> B12345678</p>
        <p><b>Dirección:</b> Calle Gran Vía 123</p>
        <p><b>CP:</b> 28013, Madrid</p>
        <p><b>Email:</b> info@posicionup.es</p>
        <p><b>Teléfono:</b> +34 600 000 000</p>
    </div>

    <!-- CLIENTE -->
    <div class="bloque derecha">
        <span class="titulo">Cliente</span>

        <p class="nombre">${f.cliente}</p>

        <p><b>Empresa:</b> ${f.empresa || "-"}</p>
        <p><b>CIF:</b> ${f.cif || "-"}</p>
        <p><b>Dirección:</b> ${f.direccion || "-"}</p>
        <p><b>CP:</b> ${f.cp || "-"}</p>
        <p><b>Email:</b> ${f.email || "-"}</p>
    </div>

</div>

    <!-- TABLA -->
    <div class="tabla">

        <div class="tabla">

<div class="tabla-header">
    <span>Concepto</span>
    <span>Base</span>
    <span>IVA (${ivaPorcentaje * 100}%)</span>
    <span>Total</span>
</div>

    <div class="tabla-row">
        <span>${f.descripcion}</span>
        <span>${formatoEUR(base)}</span>
        <span>${formatoEUR(iva)}</span>
        <span>${formatoEUR(total)}</span>
    </div>

</div>

    <!-- TOTALES -->
    <div class="totales">

    <div class="linea">
        <span>Base imponible</span>
        <span>${formatoEUR(base)}</span>
    </div>

<div class="linea">
    <span>IVA (${ivaPorcentaje * 100}%)</span>
    <span>${formatoEUR(iva)}</span>
</div>

    <div class="linea">
        <span>Total</span>
        <span>${formatoEUR(total)}</span>
    </div>

    <div class="linea">
        <span>Pagado</span>
        <span>${formatoEUR(pagado)}</span>
    </div>

    <div class="linea total">
        <span>Pendiente</span>
        <span>${formatoEUR(pendiente)}</span>
    </div>

</div>

    <!-- FOOTER -->
    <div class="footer">
        <p>Gracias por confiar en PosicionUp 🚀</p>
    </div>

</div>
`;

    const contenedor = document.getElementById("facturaPDF");

    // 🔥 AQUÍ ESTABA EL PROBLEMA
    contenedor.innerHTML = html;
    contenedor.style.display = "block";

    setTimeout(() => {

        html2pdf()
            .from(contenedor)
            .set({
                margin: 10,
                filename: `factura_${f.cliente}.pdf`,
                html2canvas: {
                    scale: 2
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4'
                }
            })
            .save()
            .then(() => {
                contenedor.style.display = "none";
                contenedor.innerHTML = "";
            });

    }, 300);
}

function calcularEstado(total, pagado) {
    if (pagado === 0) return "pendiente";
    if (pagado < total) return "parcial";
    return "pagado";
}

function calcularPendiente(total, pagado) {
    return total - pagado;
}

function sumarPago(i) {

    const cantidad = prompt("¿Cuánto ha pagado?");
    if (!cantidad) return;

    facturas[i].pagado = (facturas[i].pagado || 0) + parseFloat(cantidad);

    localStorage.setItem("facturas", JSON.stringify(facturas));

    cargarFacturas();
}

function editarFactura(i) {

    const f = facturas[i];

    facturaEditandoIndex = i;

    facturaCliente.value = f.cliente || "";
    facturaEmpresa.value = f.empresa || "";
    facturaConcepto.value = f.descripcion || "";
    facturaImporte.value = f.importe || 0;
    facturaIVA.value = f.iva ?? 0.21;

    modalFactura.style.display = "flex";
}

let clientesGlobal = [];

// ================= INCIDENCIAS =================

// ❌ elimina esta línea si la tienes arriba
// let incidencias = JSON.parse(localStorage.getItem("incidencias")) || [];


async function cargarIncidencias() {

    await cargarClientes(); // 🔥 primero clientes

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/incidencias");
    const data = await res.json();

    pintarIncidencias(data);
}

function pintarIncidencias(data) {

    const tbody = document.querySelector("#tablaIncidencias tbody");

    if (!tbody) {
        console.error("❌ No existe #tablaIncidencias tbody");
        return;
    }

    tbody.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:30px;">
                ⚠️ No hay incidencias
            </td>
        </tr>`;
        return;
    }

    let html = "";

    data.forEach((i, index) => {

        const safe = (v) => v ? v : "";

        const clase =
            i.estado === "abierta" ? "estado-nuevo" :
                i.estado === "proceso" ? "estado-contactado" :
                    "estado-cerrado";

        // ✅ CLIENTE
        const nombreCliente = i.cliente
            ? `<div style="font-weight:600;">${i.cliente}</div>`
            : '<span style="color:#94a3b8;">Sin cliente</span>';

        html += `
<tr>
    <td>${index + 1}</td>

    <td class="nombre-cell">
        ${nombreCliente}
    </td>

    <td>
        <span class="badge">${safe(i.empresa) || '-'}</span>
    </td>

    <td style="max-width:300px;">
        ${safe(i.descripcion)}
    </td>

    <td>
    <div style="font-weight:600;">${formatearFecha(i.fecha)}</div>
<div style="font-size:12px; color:#64748b;">${formatearHora(i.hora)}</div>
    </td>

    <td>
        <span class="badge-estado ${clase}">
            ${safe(i.estado)}
        </span>
    </td>

    <td class="acciones">
        <button class="btn-edit" onclick="cambiarEstadoIncidencia(${i.id}, '${i.estado}')">
            <i class="fas fa-sync"></i>
        </button>

        <button class="btn-delete" onclick="eliminarIncidencia(${i.id})">
            <i class="fas fa-trash"></i>
        </button>
    </td>
</tr>
`;
    });

    tbody.innerHTML = html;
}

async function cambiarEstadoIncidencia(id, estadoActual) {

    const estados = ["abierta", "proceso", "cerrada"];
    const nuevoEstado = estados[(estados.indexOf(estadoActual) + 1) % 3];

    await fetch(`https://crm-backend-production-7e25.up.railway.app/incidencias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
    });

    cargarIncidencias();
}

async function eliminarIncidencia(id) {

    if (!confirm("¿Eliminar incidencia?")) return;

    await fetch(`https://crm-backend-production-7e25.up.railway.app/incidencias/${id}`, {
        method: "DELETE"
    });

    cargarIncidencias();
}
async function abrirModalIncidencia() {

    await cargarClientes(); // 🔥 cargar desde backend

    cargarClientesSelectIncidencias(); // 🔥 llenar select

    document.getElementById("modalIncidencia").style.display = "flex";
}

function cerrarModalIncidencia() {
    modalIncidencia.style.display = "none";

    incCliente.value = "";
    incEmpresa.value = "";
    incDesc.value = "";
}

async function guardarIncidencia() {

    const now = new Date(); // 🔥 una sola instancia

    const nueva = {
        cliente: document.getElementById("incCliente").value.trim(),
        empresa: document.getElementById("incEmpresa").value.trim(),
        descripcion: document.getElementById("incDesc").value.trim(),
        estado: "abierta",

        // 🔥 FORMATO CORRECTO
        fecha: now.toISOString(),
        hora: now.toTimeString().slice(0, 5)
    };

    if (!nueva.cliente || !nueva.descripcion) {
        mostrarToast("Cliente y descripción obligatorios");
        return;
    }

    console.log("Incidencia enviada:", nueva);

    try {
        await fetch("https://crm-backend-production-7e25.up.railway.app/incidencias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nueva)
        });

        cerrarModalIncidencia();
        cargarIncidencias();

    } catch (error) {
        console.error("Error al guardar incidencia:", error);
        mostrarToast("Error al guardar");
    }
}
// ================= AJUSTES =================

function cargarAjustes() {

    const datos = JSON.parse(localStorage.getItem("ajustes")) || {};

    ajNombre.value = datos.nombre || "";
    ajEmail.value = datos.email || "";
    ajEmpresa.value = datos.empresa || "";
    ajCIF.value = datos.cif || "";
    ajDireccion.value = datos.direccion || "";
    ajTelefono.value = datos.telefono || "";
}

function guardarAjustes() {

    const datos = {
        nombre: ajNombre.value,
        email: ajEmail.value,
        empresa: ajEmpresa.value,
        cif: ajCIF.value,
        direccion: ajDireccion.value,
        telefono: ajTelefono.value
    };

    localStorage.setItem("ajustes", JSON.stringify(datos));

    // 🔥 actualizar nombre arriba
    if (datos.nombre) {
        document.getElementById("userName").innerText = datos.nombre;
    }

    toast("Ajustes guardados");
}

function exportarDatos() {

    const data = {
        clientes: localStorage.getItem("clientes"),
        leads: localStorage.getItem("leads"),
        facturas: localStorage.getItem("facturas"),
        proyectos: localStorage.getItem("proyectos"),
        incidencias: localStorage.getItem("incidencias"),
        ajustes: localStorage.getItem("ajustes")
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "backup_crm.json";
    a.click();
}

function resetearTodo() {

    if (!confirm("⚠️ Esto borrará TODO el CRM. ¿Seguro?")) return;

    localStorage.clear();

    location.reload();
}

function autocompletarEmpresa() {

    const clienteId = document.getElementById("incCliente").value;

    const cliente = clientesGlobal.find(c => c.id == clienteId);

    if (cliente) {
        document.getElementById("incEmpresa").value = cliente.empresa || "";
    } else {
        document.getElementById("incEmpresa").value = "";
    }
}

//  document.getElementById("totalIngresos").innerText = "€" + ingresos;


function validarFormulario() {

    const nombreVal = nombre.value.trim();
    const emailVal = email.value.trim();

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let valido = true;

    if (!nombreVal) valido = false;
    if (!emailVal || !regexEmail.test(emailVal)) valido = false;

    document.getElementById("btnGuardar").disabled = !valido;
}

nombre.addEventListener("input", validarFormulario);
email.addEventListener("input", validarFormulario);


async function verCliente(idCliente) {

    try {

        console.log("👉 ID recibido:", idCliente);

        const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");

        if (!res.ok) {
            throw new Error("Error al obtener clientes");
        }

        const clientes = await res.json();

        console.log("📦 Clientes:", clientes);

        // 🔥 comparación segura SIEMPRE
        const c = clientes.find(c => String(c.id) === String(idCliente));

        if (!c) {
            console.error("❌ Cliente no encontrado:", idCliente, clientes);
            return;
        }

        window.clienteActualId = c.id;

        // 🔹 HELPERS
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
        };

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val || "";
        };

        const setHTML = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = val || "";
        };

        // 🔹 RESUMEN
        setVal("verNombre", c.nombre);
        setVal("verEmpresa", c.empresa);
        setVal("verEmail", c.email);
        setVal("verTelefono", c.telefono);

        const avatar = document.getElementById("avatarCliente");
        if (avatar) {
            avatar.innerText = c.nombre ? c.nombre[0].toUpperCase() : "C";
        }

        // 🔹 NOTAS
        const notas = JSON.parse(localStorage.getItem("notasClientes")) || {};
        setVal("verNotas", notas[c.id]);

        // 🔹 SERVICIOS
        const proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
        const servicios = proyectos.filter(p => String(p.clienteId) === String(c.id));

        let htmlServicios = servicios.length === 0
            ? "Sin servicios"
            : servicios.map(s => `
                <div style="padding:8px; border-bottom:1px solid #eee;">
                    <strong>${s.titulo}</strong><br>
                    <small style="color:#64748b;">${s.estado}</small>
                </div>
            `).join("");

        setHTML("verServicios", htmlServicios);

        // 🔹 FACTURAS
        const facturas = JSON.parse(localStorage.getItem("facturas")) || [];

        const clienteFacturas = facturas.filter(f =>
            (f.cliente || "").toLowerCase() === (c.nombre || "").toLowerCase()
        );

        let total = 0;
        let pendiente = 0;

        clienteFacturas.forEach(f => {
            const base = Number(f.importe) || 0;
            const iva = Number(f.iva ?? 0.21);
            const totalF = base * (1 + iva);
            const pagado = Number(f.pagado) || 0;

            total += totalF;
            pendiente += (totalF - pagado);
        });

        setText("verTotal", total.toFixed(2) + " €");
        setText("verPendiente", pendiente.toFixed(2) + " €");

        // 🔹 MOSTRAR MODAL
        const modal = document.getElementById("modalVerCliente");
        if (modal) {
            modal.style.display = "flex";
        }

    } catch (error) {
        console.error("❌ Error en verCliente:", error);
    }
}

async function cargarClientesCorreo() {

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/clientes");
    const clientes = await res.json();

    const select = document.getElementById("correoPara");

    select.innerHTML = `<option value="">Seleccionar cliente</option>`;

    clientes.forEach(c => {
        select.innerHTML += `
            <option value="${c.email}">
                ${c.nombre} (${c.email})
            </option>
        `;
    });
}

function abrirModalCorreo() {
    modalCorreo.style.display = "flex";
    cargarClientesCorreo();
}

function editarCorreo(i) {

    const c = correos[i];

    window.correoEditando = i;

    correoPara.value = c.destinatario;
    correoAsunto.value = c.asunto;
    correoMensaje.value = c.mensaje;

    modalCorreo.style.display = "flex";
}

function eliminarCorreo(i) {

    if (!confirm("¿Eliminar este correo?")) return;

    correos.splice(i, 1);

    localStorage.setItem("correos", JSON.stringify(correos));

    // limpiar vista
    document.getElementById("detalleCorreo").innerHTML = `
        <p style="color:#64748b;">Selecciona un correo</p>
    `;

    cargarCorreos();

    toast("Correo eliminado");
}

// ===== TOGGLE SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (!sidebar || !overlay) return;

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

// ===== EVENTOS GLOBALES =====
document.addEventListener("click", function (e) {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (!sidebar || !overlay) return;

    // 🔹 Click en overlay → cerrar
    if (e.target.id === "overlay") {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }

    // 🔹 Click en enlaces del menú → cerrar
    if (e.target.closest(".sidebar a")) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }

});


async function cargarGastos() {

    const res = await fetch("https://crm-backend-production-7e25.up.railway.app/gastos");
    const gastos = await res.json();

    const total = gastos.reduce((sum, g) => sum + g.cantidad, 0);

    document.getElementById("gastos").innerText = "€" + total;

    return total;
}

async function abrirFichaEmpresarial() {

    const id = window.clienteActualId;

    const res = await fetch(`https://crm-backend-production-7e25.up.railway.app/empresa/${id}`);
    const data = await res.json();

    // 🔥 rellenar campos
    empNombre.value = data.nombre || "";
    empCif.value = data.cif || "";
    empDireccion.value = data.direccion || "";
    empCnae.value = data.cnae || "";
    empIae.value = data.iae || "";
    empActividad.value = data.actividad || "";
    empFechaInicio.value = data.fechaInicio || "";
    empCuentas.value = data.cuentas || "";

    empAdmin.value = data.admin || "";
    empDniAdmin.value = data.dniAdmin || "";
    empIban.value = data.iban || "";
    empRea.value = data.rea || "";

    empSeguroCompania.value = data.seguroCompania || "";
    empSeguroPoliza.value = data.seguroPoliza || "";
    empSeguroCobertura.value = data.seguroCobertura || "";
    empSeguroVigencia.value = data.seguroVigencia || "";

    empSeguroExtra.value = data.seguroExtra || "";
    empConvenio.value = data.convenio || "";
    empMutua.value = data.mutua || "";

    empEmail.value = data.email || "";
    empTelefono.value = data.telefono || "";
    empContacto.value = data.contacto || "";
    empCuota.value = data.cuota || "";

    empNotario.value = data.notario || "";
    empFechaConst.value = data.fechaConst || "";
    empProtocolo.value = data.protocolo || "";
    empLibro.value = data.libro || "";
    empTomo.value = data.tomo || "";
    empRegistro.value = data.registro || "";

    modalEmpresa.style.display = "flex";
}

function cerrarFichaEmpresa() {
    modalEmpresa.style.display = "none";
}

async function guardarFichaEmpresa() {

    const id = window.clienteActualId;

    // 🔥 DEBUG CLAVE
    console.log("ID CLIENTE:", id);

    const data = {
        clienteId: Number(window.clienteActualId),

        nombre: empNombre.value,
        cif: empCif.value,
        direccion: empDireccion.value,
        cnae: empCnae.value,
        iae: empIae.value,
        actividad: empActividad.value,
        fechaInicio: empFechaInicio.value,
        cuentas: empCuentas.value,

        admin: empAdmin.value,
        dniAdmin: empDniAdmin.value,
        iban: empIban.value,
        rea: empRea.value,

        seguroCompania: empSeguroCompania.value,
        seguroPoliza: empSeguroPoliza.value,
        seguroCobertura: empSeguroCobertura.value,
        seguroVigencia: empSeguroVigencia.value,

        seguroExtra: empSeguroExtra.value,
        convenio: empConvenio.value,
        mutua: empMutua.value,

        email: empEmail.value,
        telefono: empTelefono.value,
        contacto: empContacto.value,
        cuota: empCuota.value,

        notario: empNotario.value,
        fechaConst: empFechaConst.value,
        protocolo: empProtocolo.value,
        libro: empLibro.value,
        tomo: empTomo.value,
        registro: empRegistro.value
    };

    console.log("ENVIANDO:", data); // 🔥 DEBUG

    try {
        await fetch("https://crm-backend-production-7e25.up.railway.app/empresa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        mostrarToast("Guardado en BD");

        cerrarFichaEmpresa();

    } catch (e) {
        console.error(e);
        mostrarToast("Error al guardar");
    }
}

async function generarPDF() {

    const { jsPDF } = window.jspdf;

    const id = window.clienteActualId;

    const res = await fetch(`https://crm-backend-production-7e25.up.railway.app/empresa/${id}`);
    const data = await res.json();

    const doc = new jsPDF();

    let y = 25;

    const pageHeight = 280;

    function calcBlockHeight(rows) {
        return 12 + (rows * 10);
    }

    function checkBlock(rows) {
        const needed = calcBlockHeight(rows);

        if (y + needed > pageHeight) {
            doc.addPage();
            header();
            y = 30;
        }
    }

    function checkPage() {
        if (y > pageHeight) {
            doc.addPage();
            header();
            y = 25;
        }
    }

    function header() {
        // 🔵 barra superior
        doc.setFillColor(15, 23, 42); // negro elegante
        doc.rect(0, 0, 210, 20, "F");

        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("POSICIONUP CRM", 10, 12);

        doc.setFontSize(10);
        doc.text("Ficha empresarial", 150, 12);

        y = 30;
    }

    function section(title) {
        checkPage();

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, "bold");
        doc.text(title, 10, y);

        y += 6;

        doc.setDrawColor(200);
        doc.line(10, y, 200, y);

        y += 6;
    }

    function field(label, value, x = 10) {
        checkPage();

        doc.setFontSize(9);
        doc.setTextColor(100);

        doc.text(label, x, y);

        doc.setFont(undefined, "bold");
        doc.setTextColor(0);

        doc.text(String(value || "-"), x, y + 4);

        doc.setFont(undefined, "normal");

        y += 10;
    }

    function twoCols(label1, val1, label2, val2) {
        checkPage();

        field(label1, val1, 10);
        y -= 10;
        field(label2, val2, 110);
    }

    header();

    // 🔷 DATOS GENERALES

    checkBlock(4);
    section("DATOS GENERALES");

    twoCols("Empresa", data.nombre, "CIF", data.cif);
    twoCols("Dirección", data.direccion, "Actividad", data.actividad);
    twoCols("CNAE", data.cnae, "IAE", data.iae);
    twoCols("Fecha inicio", data.fechaInicio, "Cuentas", data.cuentas);

    y += 5;

    // 🔷 ADMINISTRACIÓN

    checkBlock(5);
    section("ADMINISTRACIÓN");

    twoCols("Administrador", data.admin, "DNI", data.dniAdmin);
    twoCols("IBAN", data.iban, "REA", data.rea);
    twoCols("Seguro", data.seguroCompania, "Póliza", data.seguroPoliza);
    twoCols("Cobertura", data.seguroCobertura, "Vigencia", data.seguroVigencia);
    twoCols("Convenio", data.convenio, "Mutua", data.mutua);

    y += 5;

    // 🔷 CONTACTO
    checkBlock(2);
    section("CONTACTO");

    twoCols("Email", data.email, "Teléfono", data.telefono);
    field("Persona contacto", data.contacto);
    field("Cuota asesoría", data.cuota);

    y += 5;

    // 🔷 ESCRITURA
    checkBlock(3);
    section("ESCRITURA");

    twoCols("Notario", data.notario, "Fecha", data.fechaConst);
    twoCols("Protocolo", data.protocolo, "Libro", data.libro);
    twoCols("Tomo", data.tomo, "Registro", data.registro);

    y += 5;

    // 🔷 SOCIOS
    checkBlock(6);
    section("SOCIOS");

    twoCols("Socio 1", data.socio1, "%", data.socio1porc);
    twoCols("DNI", data.socio1dni, "", "");

    twoCols("Socio 2", data.socio2, "%", data.socio2porc);
    twoCols("DNI", data.socio2dni, "", "");

    twoCols("Socio 3", data.socio3, "%", data.socio3porc);
    twoCols("DNI", data.socio3dni, "", "");

    y += 5;

    // 🔷 TITULARIDAD REAL
    checkBlock(4);
    section("TITULARIDAD REAL");

    twoCols("Titular 1", data.titular1, "%", data.titular1porc);
    twoCols("DNI", data.titular1dni, "", "");

    twoCols("Titular 2", data.titular2, "%", data.titular2porc);
    twoCols("DNI", data.titular2dni, "", "");

    // 🔻 FOOTER
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Documento generado automáticamente - PosicionUp CRM", 10, 290);

    doc.save(`Ficha_Empresarial_${id}.pdf`);
}

let eventos = JSON.parse(localStorage.getItem("eventos")) || [];
let eventoEditando = null;

let fechaActual = new Date();

// ================= MODAL =================

function abrirModalEvento(fecha = null) {

    eventoEditando = null;

    modalEvento.style.display = "flex";

    evTitulo.value = "";
    evTipo.value = "";
    evDesc.value = "";

    if (fecha) {
        evFecha.value = fecha + "T10:00";
    }

    document.getElementById("btnEliminarEvento").style.display = "none";
}

function verEvento(id) {

    const e = eventos.find(ev => ev.id === id);

    if (!e) return;

    eventoEditando = e.id;

    modalEvento.style.display = "flex";

    evTitulo.value = e.titulo;
    evFecha.value = e.fecha;
    evTipo.value = e.tipo;
    evDesc.value = e.descripcion || "";

    document.getElementById("btnEliminarEvento").style.display = "block";
    document.getElementById("btnEliminarEvento").onclick = () => eliminarEvento(e.id);
}

// ================= GUARDAR =================

// ===============================
// 🧠 GUARDAR EVENTO (FINAL)
// ===============================
async function guardarEvento() {

    const enviarClienteCheck = document.getElementById("enviarCliente")?.checked;
    const emailClienteVal = document.getElementById("emailCliente")?.value;

    const nuevo = {
        titulo: evTitulo?.value,
        fecha: evFecha?.value,
        tipo: evTipo?.value,
        descripcion: evDesc?.value
    };

    if (!nuevo.titulo) {
        mostrarToast("Título obligatorio");
        return;
    }

    try {

        // =========================
        // 💾 GUARDAR EVENTO MYSQL
        // =========================

        const resEvento = await fetch("https://crm-backend-production-7e25.up.railway.app/eventos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(nuevo)
        });

        if (!resEvento.ok) {
            throw new Error("Error guardando evento");
        }

        // =========================
        // 📁 CREAR PROYECTO MYSQL
        // =========================

        await fetch("https://crm-backend-production-7e25.up.railway.app/proyectos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                titulo: nuevo.titulo,
                descripcion: nuevo.descripcion,
                estado: "pendiente",
                fecha: nuevo.fecha
            })
        });

        // =========================
        // 🔄 RECARGAR DATOS MYSQL
        // =========================

        await cargarEventos();
        await cargarProyectos();

        // =========================
        // 🔄 UI
        // =========================

        renderCalendario();
        cerrarModalEvento();

        // =========================
        // 📧 EMAIL
        // =========================

        enviarEmailsEvento(nuevo, enviarClienteCheck, emailClienteVal);

        mostrarToast("✅ Evento guardado");

    } catch (error) {

        console.error("❌ Error guardando:", error);
        mostrarToast("❌ Error guardando evento");
    }
}



// ===============================
// 📧 ENVÍO DE EMAILS
// ===============================
async function enviarEmailsEvento(evento, enviarCliente, emailCliente) {

    const fechaObj = new Date(evento.fecha);

    const fechaFormateada = fechaObj.toLocaleDateString("es-ES");
    const horaFormateada = fechaObj.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const inicio = formatearFechaGoogle(fechaObj);
    const fin = formatearFechaGoogle(new Date(fechaObj.getTime() + 30 * 60000));

    const linkCalendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.titulo)}&dates=${inicio}/${fin}&details=${encodeURIComponent(evento.descripcion || "")}`;

    const htmlCorreo = generarHTMLCorreo(evento, fechaFormateada, horaFormateada, linkCalendar);

    try {

        // 🚀 EMAIL INTERNO
        await fetch("https://crm-backend-production-7e25.up.railway.app/correo/enviar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                para: "posicionup.agencia@gmail.com",
                asunto: "📅 Nueva cita creada",
                mensaje: htmlCorreo
            })
        });

        // 🚀 EMAIL CLIENTE
        if (enviarCliente && emailCliente) {
            await fetch("https://crm-backend-production-7e25.up.railway.app/correo/enviar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    para: emailCliente,
                    asunto: "📅 Confirmación de cita",
                    mensaje: htmlCorreo
                })
            });
        }

    } catch (error) {
        console.error("❌ Error enviando emails:", error);
    }
}



// ===============================
// 📅 FORMATO GOOGLE CALENDAR
// ===============================
function formatearFechaGoogle(fecha) {
    const YYYY = fecha.getFullYear();
    const MM = String(fecha.getMonth() + 1).padStart(2, '0');
    const DD = String(fecha.getDate()).padStart(2, '0');
    const HH = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');

    return `${YYYY}${MM}${DD}T${HH}${mm}00`;
}



// ===============================
// 🎨 HTML EMAIL
// ===============================
function generarHTMLCorreo(evento, fecha, hora, link) {

    return `
<div style="font-family:Arial, sans-serif; background:#020617; padding:40px 20px;">

  <div style="max-width:650px; margin:auto; background:#0f172a; border-radius:20px; overflow:hidden; border:1px solid #1e293b; box-shadow:0 20px 50px rgba(0,0,0,0.6);">

    <!-- HEADER -->
    <div style="padding:35px 25px; text-align:center; border-bottom:1px solid #1e293b;">
        <h1 style="color:#22c55e; margin:0; font-size:24px;">Confirmación de cita</h1>
        <p style="color:#64748b; margin-top:8px; font-size:13px;">
            PosicionUp · Gestión inteligente de clientes
        </p>
    </div>

    <!-- CONTENIDO -->
    <div style="padding:30px; color:#e2e8f0; line-height:1.6;">

        <p style="margin-bottom:18px;">
            Hola,
        </p>

        <p style="margin-bottom:18px; color:#cbd5f5;">
            Te confirmamos que tu cita ha sido registrada correctamente en nuestro sistema. 
            Nuestro equipo tiene ya toda la información preparada para ofrecerte la mejor atención posible.
        </p>

        <p style="margin-bottom:25px; color:#94a3b8;">
            A continuación puedes consultar todos los detalles de tu cita. 
            Te recomendamos añadirla a tu calendario para no olvidarla.
        </p>

        <!-- BLOQUE INFO -->
        <div style="background:#020617; border:1px solid #1e293b; border-radius:14px; overflow:hidden;">

    <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">
        <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
            EVENTO
        </span>
        <span style="font-size:16px; font-weight:600; color:#f1f5f9;">
            ${evento.titulo}
        </span>
    </div>

    <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">
        <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
            FECHA
        </span>
        <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
            ${fecha}
        </span>
    </div>

    <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">
        <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
            HORA
        </span>
        <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
            ${hora}
        </span>
    </div>

    <div style="padding:16px 20px;">
        <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
            TIPO
        </span>
        <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
            ${evento.tipo}
        </span>
    </div>

</div>

        <!-- CTA -->
        <div style="text-align:center; margin-top:30px;">
            <a href="${link}" target="_blank"
               style="background:linear-gradient(135deg,#22c55e,#16a34a); color:#020617; padding:15px 28px; border-radius:12px; text-decoration:none; font-weight:bold; display:inline-block;">
               Añadir a Google Calendar
            </a>
        </div>

        <!-- TEXTO EXTRA -->
        <p style="margin-top:30px; font-size:14px; color:#94a3b8;">
            Si necesitas modificar o cancelar la cita, puedes hacerlo directamente desde tu panel o contactando con nosotros.
            Estaremos encantados de ayudarte.
        </p>

    </div>

    <!-- FOOTER -->
    <div style="padding:25px; text-align:center; border-top:1px solid #1e293b; background:#020617;">

        <p style="margin:0; color:#64748b; font-size:13px;">
            PosicionUp 🚀
        </p>

        <p style="margin:8px 0 0 0; color:#475569; font-size:12px;">
            Calle de Ramos Carrión 5 Local 4, Madrid · España
        </p>

        <p style="margin:5px 0 0 0; color:#475569; font-size:12px;">
            Email: contacto@posicionup.es
        </p>

    </div>

  </div>

</div>
`;
}

// ================= ELIMINAR =================

async function eliminarEvento(id) {

    console.log("🗑️ ID A ELIMINAR:", id);

    if (!confirm("¿Eliminar evento?")) return;

    try {

        const res = await fetch(`https://crm-backend-production-7e25.up.railway.app/eventos/${id}`, {
            method: "DELETE"
        });

        console.log("STATUS:", res.status);

        if (!res.ok) {
            throw new Error("Error eliminando");
        }

        await cargarEventos();

        cerrarModalEvento();

        mostrarToast("✅ Evento eliminado");

    } catch (error) {

        console.error("❌ Error eliminando:", error);
        mostrarToast("❌ Error eliminando evento");
    }
}

function cerrarModalEvento() {
    const modal = document.getElementById("modalEvento");
    if (modal) modal.style.display = "none";
}

// ================= CALENDARIO =================

async function cargarEventos() {

    try {

        const res = await fetch("https://crm-backend-production-7e25.up.railway.app/eventos");

        if (!res.ok) {
            throw new Error("Error cargando eventos");
        }

        eventos = await res.json();

        console.log("📅 EVENTOS MYSQL:", eventos);

        renderCalendario();

    } catch (error) {

        console.error("❌ Error cargando eventos:", error);
    }
}

function cambiarMes(valor) {
    fechaActual.setMonth(fechaActual.getMonth() + valor);
    renderCalendario();
}

function renderCalendario() {

    const calendario = document.getElementById("calendario");
    const mesTitulo = document.getElementById("mesActual");

    calendario.innerHTML = "";

    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();

    const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    mesTitulo.innerText = nombresMeses[mes] + " " + año;

    let primerDia = new Date(año, mes, 1).getDay();

    primerDia = primerDia === 0 ? 6 : primerDia - 1; const diasMes = new Date(año, mes + 1, 0).getDate();

    // espacios iniciales
    for (let i = 0; i < primerDia; i++) {
        calendario.innerHTML += `<div></div>`;
    }

    // días
    for (let d = 1; d <= diasMes; d++) {

        const fechaStr = `${año}-${(mes + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;

        let eventosDia = eventos.filter(e => e.fecha && e.fecha.startsWith(fechaStr));

        let htmlEventos = eventosDia.map(e => {
            const index = eventos.indexOf(e);
            return `
                <div class="evento" onclick="event.stopPropagation();verEvento(${e.id})">
    ${e.titulo}
</div>
            `;
        }).join("");

        calendario.innerHTML += `
            <div class="dia" onclick="abrirModalEvento('${fechaStr}')">
                <div class="dia-num">${d}</div>
                ${htmlEventos}
            </div>
        `;
    }
}

function noti(msg) {
    const n = document.getElementById("notificacion");
    n.innerText = msg;

    n.classList.add("show");

    setTimeout(() => {
        n.classList.remove("show");
    }, 3000);
}

function formatearFechaGoogle(fechaInput) {
    const fecha = new Date(fechaInput);

    const YYYY = fecha.getFullYear();
    const MM = String(fecha.getMonth() + 1).padStart(2, '0');
    const DD = String(fecha.getDate()).padStart(2, '0');
    const HH = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');

    return `${YYYY}${MM}${DD}T${HH}${mm}00`;
}

function nuevoCliente() {

    // 🔥 LIMPIAR ID (esto es CLAVE)
    id.value = "";

    // 🔥 LIMPIAR CAMPOS
    nombre.value = "";
    email.value = "";
    telefono.value = "";
    empresa.value = "";
    document.getElementById("cif").value = "";
    document.getElementById("direccion").value = "";

    // 🔥 LIMPIAR ERRORES
    document.getElementById("errorNombre").innerText = "";
    document.getElementById("errorEmail").innerText = "";

    // 🔥 CAMBIAR TÍTULO
    tituloModal.innerText = "Nuevo Cliente";

    // 🔥 ABRIR MODAL
    abrirModal();
}

function cargarClientesSelectIncidencias() {

    const select = document.getElementById("incCliente");

    if (!select) {
        console.error("❌ No existe #incCliente");
        return;
    }

    select.innerHTML = `<option value="">Seleccionar cliente</option>`;

    clientesGlobal.forEach(c => {
        select.innerHTML += `
            <option value="${c.id}">
                ${c.nombre} ${c.empresa ? "- " + c.empresa : ""}
            </option>
        `;
    });
}

// 🔥 EVENTO SELECT CLIENTE
document.addEventListener("change", function (e) {

    if (e.target.id === "incCliente") {

        const clienteId = e.target.value;

        const cliente = clientesGlobal.find(c => c.id == clienteId);

        document.getElementById("incEmpresa").value = cliente?.empresa || "";
    }

});

function formatearFecha(fechaStr) {
    if (!fechaStr) return "-";

    if (fechaStr.includes("/")) return fechaStr; // soporte viejo

    const fecha = new Date(fechaStr);

    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const año = fecha.getFullYear();

    return `${dia}/${mes}/${año}`;
}

function formatearHora(horaStr) {
    if (!horaStr) return "";

    // Si ya viene tipo "09:05" lo dejamos
    if (horaStr.includes(":")) {
        const [h, m] = horaStr.split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    }

    return horaStr;
}

function formatoEUR(num) {
    return `${Number(num).toFixed(2)} €`;
}

function guardarNotasCliente() {

    const notas = JSON.parse(localStorage.getItem("notasClientes")) || {};
    notas[window.clienteActualId] = verNotas.value;

    localStorage.setItem("notasClientes", JSON.stringify(notas));

    mostrarToast("Notas guardadas");
}

function editarClienteModo() {

    document.querySelectorAll("#modalVerCliente input, #verNotas")
        .forEach(i => i.disabled = false);
}

function descargarFichaClientePDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Ficha Cliente", 20, 20);

    doc.text("Nombre: " + dNombre.innerText, 20, 40);
    doc.text("Empresa: " + dEmpresa.innerText, 20, 50);
    doc.text("Email: " + dEmail.innerText, 20, 60);
    doc.text("Teléfono: " + dTelefono.innerText, 20, 70);
    doc.text("CIF: " + dCif.innerText, 20, 80);
    doc.text("Dirección: " + dDireccion.innerText, 20, 90);

    doc.text("Total: " + dTotal.innerText, 20, 110);
    doc.text("Pendiente: " + dPendiente.innerText, 20, 120);

    doc.save("cliente.pdf");
}

function mostrarDetalleCliente() {
    document.getElementById("vistaResumen").style.display = "none";
    document.getElementById("vistaDetalle").style.display = "block";
}

function volverResumen() {
    document.getElementById("vistaResumen").style.display = "block";
    document.getElementById("vistaDetalle").style.display = "none";
}

function cerrarModalVerCliente() {
    document.getElementById("modalVerCliente").style.display = "none";
}

function abrirFichaEmpresarial() {
    document.getElementById("modalDatosEmpresariales").style.display = "flex";
}

function cerrarDatosEmpresariales() {
    document.getElementById("modalDatosEmpresariales").style.display = "none";
}

function guardarDatosEmpresa() {

    const id = window.clienteActualId;

    const datos = {
        nombre: emp_nombre.value,
        cif: emp_cif.value,
        domicilio: emp_domicilio.value,
        admin: adm_nombre.value
    };

    let empresas = JSON.parse(localStorage.getItem("empresas")) || {};
    empresas[id] = datos;

    localStorage.setItem("empresas", JSON.stringify(empresas));

    mostrarToast("Datos guardados");
}

function descargarDatosEmpresaPDF() {

    const contenido = document.createElement("div");

    contenido.innerHTML = `
        <h2>Datos empresariales</h2>

        <h3>Datos generales</h3>
        <p><strong>Empresa:</strong> ${emp_nombre.value}</p>
        <p><strong>CIF:</strong> ${emp_cif.value}</p>
        <p><strong>Domicilio:</strong> ${emp_domicilio.value}</p>

        <h3>Administración</h3>
        <p><strong>Administrador:</strong> ${adm_nombre.value}</p>
        <p><strong>DNI:</strong> ${adm_dni.value}</p>
        <p><strong>IBAN:</strong> ${adm_iban.value}</p>

        <h3>Contacto</h3>
        <p><strong>Email:</strong> ${cont_email.value}</p>
        <p><strong>Teléfono:</strong> ${cont_tel.value}</p>
    `;

    html2pdf()
        .set({
            margin: 10,
            filename: 'datos_empresariales.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(contenido)
        .save();
}

function generarPDF(html, nombre = "documento.pdf") {

    const contenedor = document.createElement("div");
    contenedor.innerHTML = html;

    html2pdf()
        .set({
            margin: 10,
            filename: nombre,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4' }
        })
        .from(contenedor)
        .save();
}

function descargarFichaClientePDF() {

    const html = `
        <h2>Ficha cliente</h2>
        <p><strong>Nombre:</strong> ${verNombre.value}</p>
        <p><strong>Email:</strong> ${verEmail.value}</p>
        <p><strong>Teléfono:</strong> ${verTelefono.value}</p>
    `;

    generarPDF(html, "cliente.pdf");
}

function descargarDatosEmpresaPDF() {

    const html = `
    <div class="pdf">

        <h1 class="titulo">Ficha Empresarial</h1>

        ${bloque("1. DATOS GENERALES", [
        ["Nombre empresa", emp_nombre.value],
        ["CIF", emp_cif.value],
        ["Domicilio", emp_domicilio.value],
        ["CNAE", emp_cnae.value],
        ["IAE", emp_iae.value],
        ["Actividad", emp_actividad.value],
        ["Fecha inicio", emp_fecha_inicio.value],
        ["Cuentas anuales", emp_presentadas.value + " - " + emp_cuentas_anuales.value]
    ])}

        ${bloque("2. ADMINISTRACIÓN", [
        ["Administrador", adm_nombre.value],
        ["DNI/NIE", adm_dni.value],
        ["IBAN", adm_iban.value],
        ["REA", adm_rea_bool.value + " - " + adm_rea.value],
        ["Mutua", adm_mutua.value],
        ["Seguro compañía", seg_compania.value],
        ["Nº póliza", seg_poliza.value],
        ["Cobertura", seg_cobertura.value]
    ])}

        ${bloque("3. CONTACTO", [
        ["Email", cont_email.value],
        ["Teléfono", cont_tel.value],
        ["Persona contacto", cont_persona.value],
        ["Cuota asesoría", cont_cuota.value]
    ])}

        ${bloque("4. ESCRITURA", [
        ["Notario", esc_notario.value],
        ["Fecha", esc_fecha.value],
        ["Protocolo", esc_protocolo.value],
        ["Libro", esc_libro.value],
        ["Tomo", esc_tomo.value],
        ["Registro Mercantil", esc_registro.value]
    ])}

        ${bloque("5. SOCIOS", [
        ["Socio 1", soc1_nombre.value + " | " + soc1_dni.value + " | " + soc1_pct.value + "%"],
        ["Socio 2", soc2_nombre.value + " | " + soc2_dni.value + " | " + soc2_pct.value + "%"],
        ["Socio 3", soc3_nombre.value + " | " + soc3_dni.value + " | " + soc3_pct.value + "%"]
    ])}

        ${bloque("6. TITULARIDAD REAL", [
        ["Titular 1", tit1_nombre.value + " | " + tit1_dni.value + " | " + tit1_pct.value + "%"],
        ["Titular 2", tit2_nombre.value + " | " + tit2_dni.value + " | " + tit2_pct.value + "%"]
    ])}

    </div>
    `;

    generarPDF(html, "ficha_empresarial_pro.pdf");
}

function bloque(titulo, campos) {

    let filas = "";

    campos.forEach(c => {
        filas += `
        <div class="fila">
            <div class="label">${c[0]}</div>
            <div class="valor">${c[1] || "-"}</div>
        </div>
        `;
    });

    return `
    <div class="bloque">
        <h2>${titulo}</h2>
        ${filas}
    </div>
    `;
}

function portada() {
    return `
    <div class="page portada">
        <h1>Ficha Empresarial</h1>
        <p>${emp_nombre.value || ""}</p>
        <div class="linea"></div>
        <p>Generado: ${new Date().toLocaleDateString()}</p>
    </div>
    `;
}

function generarPDF(html, nombre) {

    const contenedor = document.createElement("div");

    contenedor.innerHTML = `
    <style>

        body {
            margin: 0;
            padding: 0;
        }

        .pdf {
            width: 100%;
            max-width: 100%;
            padding: 20px;
            box-sizing: border-box;
            font-family: Arial;
            color:#1e293b;
        }

        .bloque {
            width: 100%;
            box-sizing: border-box;
            background:#f9fafb;
            border-radius:12px;
            padding:15px;
            margin-bottom:20px;

            page-break-inside: avoid;
            break-inside: avoid;
        }

        h2 {
            width: 100%;
            box-sizing: border-box;
            background:#3b82f6;
            color:white;
            padding:10px;
            border-radius:8px;
            font-size:16px;
        }

        .fila {
            display:flex;
            justify-content:space-between;
            padding:10px;
            border-bottom:1px solid #e5e7eb;
            width: 100%;
        }

        .label {
            font-weight:bold;
            width:50%;
        }

        .valor {
            width:50%;
            text-align:right;
        }

    </style>
    <div class="pdf">
        ${html}
    </div>
    `;

    html2pdf()
        .set({
            margin: [5, 5, 5, 5], // 🔥 reduce márgenes
            filename: nombre,
            html2canvas: {
                scale: 2,
                useCORS: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        })
        .from(contenedor)
        .save();
}
function descargarFactura() {

    const factura = document.getElementById("facturaPDF");

    if (!factura) {
        console.error("No existe facturaPDF");
        return;
    }

    html2pdf().from(factura).save("factura.pdf");
}

function descargarFacturaPDF(factura) {

    const contenedor = document.getElementById("facturaPDF");

    if (!contenedor) {
        console.error("❌ No existe #facturaPDF");
        return;
    }

    // 💥 GENERAR HTML BONITO
    contenedor.innerHTML = `
<div style="font-family:Arial; padding:50px; color:#0f172a; background:white;">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px;">

        <div>
            <h1 style="margin:0; color:#16a34a; letter-spacing:1px;">FACTURA</h1>
            <p style="margin:5px 0; color:#64748b;">Nº: ${factura.numero || "—"}</p>
            <p style="margin:0; color:#64748b;">Fecha: ${factura.fecha || "-"}</p>
        </div>

        <div style="text-align:right;">
            <h2 style="margin:0;">PosicionUp</h2>
            <p style="margin:5px 0; font-size:13px; color:#64748b;">
                Marketing & Desarrollo Web
            </p>
        </div>

    </div>

    <!-- BLOQUES -->
    <div style="display:flex; gap:30px; margin-bottom:40px;">

        <!-- EMISOR -->
        <div style="flex:1; background:#f1f5f9; padding:20px; border-radius:12px;">
            <h4 style="margin-bottom:10px; color:#64748b;">EMISOR</h4>

            <strong>PosicionUp</strong><br>
            CIF: B12345678<br>
            Dirección: Calle Gran Vía 123<br>
            CP: 28013, Madrid<br>
            Email: info@posicionup.es<br>
            Tel: +34 600 000 000
        </div>

        <!-- CLIENTE -->
        <div style="flex:1; background:#f8fafc; padding:20px; border-radius:12px;">
            <h4 style="margin-bottom:10px; color:#64748b;">CLIENTE</h4>

            <strong>${factura.cliente || "-"}</strong><br>
            Empresa: ${factura.empresa || "-"}<br>
            CIF: ${factura.cif || "-"}<br>
            Dirección: ${factura.direccion || "-"}<br>
            CP: ${factura.cp || "-"}<br>
            Email: ${factura.email || "-"}
        </div>

    </div>

    <!-- TABLA -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:30px; overflow:hidden; border-radius:10px;">

        <thead>
            <tr style="background:linear-gradient(135deg,#16a34a,#22c55e); color:white;">
                <th style="padding:14px; text-align:left;">Concepto</th>
                <th style="padding:14px;">Base</th>
                <th style="padding:14px;">IVA</th>
                <th style="padding:14px;">Total</th>
            </tr>
        </thead>

        <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:14px;">${factura.descripcion || "-"}</td>
                <td style="text-align:center;">${factura.importe.toFixed(2)} €</td>
                <td style="text-align:center;">${(factura.importe * (factura.iva || 0.21)).toFixed(2)} €</td>
                <td style="text-align:center; font-weight:bold;">
                    ${(factura.importe * (1 + (factura.iva || 0.21))).toFixed(2)} €
                </td>
            </tr>
        </tbody>

    </table>

    <!-- RESUMEN -->
    <div style="display:flex; justify-content:flex-end;">

        <div style="width:280px; background:#f8fafc; padding:20px; border-radius:12px;">

            <p style="display:flex; justify-content:space-between;">
                <span>Base imponible</span>
                <span>${factura.importe.toFixed(2)} €</span>
            </p>

            <p style="display:flex; justify-content:space-between;">
                <span>IVA</span>
                <span>${(factura.importe * (factura.iva || 0.21)).toFixed(2)} €</span>
            </p>

            <hr>

            <p style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>Total</span>
                <span>${(factura.importe * (1 + (factura.iva || 0.21))).toFixed(2)} €</span>
            </p>

            <p style="display:flex; justify-content:space-between; color:#dc2626;">
                <span>Pendiente</span>
                <span>${(factura.importe * (1 + (factura.iva || 0.21))).toFixed(2)} €</span>
            </p>

        </div>

    </div>

    <!-- FOOTER -->
    <div style="margin-top:50px; text-align:center; color:#94a3b8; font-size:13px;">
        Gracias por confiar en PosicionUp 🚀
    </div>

</div>
`;

    // 📄 OPCIONES PDF
    const opt = {
        margin: 10,
        filename: `factura_${factura.cliente || "cliente"}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 🚀 GENERAR PDF
    html2pdf().set(opt).from(contenedor).save();
}

async function cargarSolicitudes() {

    try {

        const res = await fetch(
            "https://crm-backend-production-7e25.up.railway.app/solicitudes"
        );

        const data = await res.json();

        console.log("📦 SOLICITUDES:", data);

        const cont =
            document.getElementById("solicitudesCitas");

        console.log("📦 CONTENEDOR:", cont);

        if (!cont) {
            console.error("❌ NO EXISTE solicitudesCitas");
            return;
        }

        let html = `
            <h2 class="titulo-solicitudes">
                Solicitudes de cita
            </h2>
        `;

        // 🔥 VACÍO
        if (!data || data.length === 0) {

            html += `
                <div class="solicitud-card"
     id="solicitud-${s.id}">

                    <p style="color:#94a3b8;">
                        📭 No hay solicitudes todavía
                    </p>

                </div>
            `;

            cont.innerHTML = html;

            return;
        }

        // 🔥 PINTAR
        data.reverse().forEach(s => {

            html += `

<div class="solicitud-card"
     id="solicitud-${s.id}">
    <h3>${s.titulo || "-"}</h3>

    <p>👤 ${s.cliente || "-"}</p>

    <p>🏢 ${s.empresa || "-"}</p>
    
    <p>📧 ${s.email || "-"}</p>

    <p>📅 ${s.fecha || "-"}</p>

    <p>⏰ ${s.hora || "-"}</p>

    <p>📝 ${s.descripcion || "-"}</p>

    <div class="estado-solicitud">
        ${s.estado || "pendiente"}
    </div>

    <div class="acciones-solicitud">

        <button class="btn-aceptar"
            onclick="aceptarSolicitud(${s.id})">

            ✅ Aceptar

        </button>

        <button class="btn-rechazar"
            onclick="rechazarSolicitud(${s.id})">

            ❌ Rechazar

        </button>


    </div>

</div>
`;
        }); 

        // 🔥 SOLO UNA VEZ
        cont.innerHTML = html;

    } catch (e) {

        console.error(
            "❌ Error cargando solicitudes:",
            e
        );
    }
}

// ===============================
// ✅ ACEPTAR SOLICITUD
// ===============================

window.aceptarSolicitud = async function (id) {

    try {

        const res = await fetch(
            "https://crm-backend-production-7e25.up.railway.app/solicitudes"
        );

        const solicitudes =
            await res.json();

        const s =
            solicitudes.find(x => x.id == id);

        if (!s) return;

        // =========================
        // 📅 CREAR EVENTO CRM
        // =========================

        let nuevosEventos =
            JSON.parse(
                localStorage.getItem("eventos")
            ) || [];

        nuevosEventos.push({

            titulo: s.titulo,

            fecha: `${s.fecha}T${s.hora}`,

            tipo: "Cita cliente",

            descripcion: s.descripcion
        });

        // =========================
        // 💾 GUARDAR CRM
        // =========================

        localStorage.setItem(
            "eventos",
            JSON.stringify(nuevosEventos)
        );

        eventos = JSON.parse(
            localStorage.getItem("eventos")
        ) || [];

        // =========================
        // 🔥 REPINTAR CALENDARIO CRM
        // =========================

        renderCalendario();

        // =========================
        // 💾 GUARDAR EN MYSQL
        // =========================

        await fetch(
            "https://crm-backend-production-7e25.up.railway.app/citas",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    titulo: s.titulo,

                    fecha: s.fecha,

                    hora: s.hora,

                    descripcion: s.descripcion,

                    cliente: s.cliente,

                    empresa: s.empresa,

                    email: s.email
                })
            }
        );

        // =========================
        // ✉️ ENVIAR EMAIL HTML
        // =========================

        await fetch(
            "https://crm-backend-production-7e25.up.railway.app/correo/enviar",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    para:
                        `${s.email},posicionup.agencia@gmail.com`,

                    asunto:
                        "✅ Confirmación de cita | PosicionUp",

                    mensaje: `

<div style="font-family:Arial, sans-serif; background:#020617; padding:40px 20px;">

  <div style="max-width:650px; margin:auto; background:#0f172a; border-radius:20px; overflow:hidden; border:1px solid #1e293b; box-shadow:0 20px 50px rgba(0,0,0,0.6);">

    <div style="padding:35px 25px; text-align:center; border-bottom:1px solid #1e293b;">

        <h1 style="color:#22c55e; margin:0; font-size:24px;">
            Confirmación de cita
        </h1>

        <p style="color:#64748b; margin-top:8px; font-size:13px;">
            PosicionUp · Gestión inteligente de clientes
        </p>

    </div>

    <div style="padding:30px; color:#e2e8f0; line-height:1.6;">

        <p style="margin-bottom:18px;">
            Hola ${s.cliente},
        </p>

        <p style="margin-bottom:18px; color:#cbd5f5;">
            Te confirmamos que tu cita ha sido registrada correctamente en nuestro sistema.
        </p>

        <p style="margin-bottom:25px; color:#94a3b8;">
            A continuación puedes consultar todos los detalles de tu cita.
        </p>

        <div style="background:#020617; border:1px solid #1e293b; border-radius:14px; overflow:hidden;">

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    EVENTO
                </span>

                <span style="font-size:16px; font-weight:600; color:#f1f5f9;">
                    ${s.titulo}
                </span>

            </div>

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    FECHA
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.fecha}
                </span>

            </div>

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    HORA
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.hora}
                </span>

            </div>

            <div style="padding:16px 20px;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    DESCRIPCIÓN
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.descripcion || "-"}
                </span>

            </div>

        </div>

        <p style="margin-top:30px; font-size:14px; color:#94a3b8;">
            Si necesitas modificar o cancelar la cita, puedes contactar con nosotros.
        </p>

    </div>

    <div style="padding:25px; text-align:center; border-top:1px solid #1e293b; background:#020617;">

        <p style="margin:0; color:#64748b; font-size:13px;">
            PosicionUp 🚀
        </p>

        <p style="margin:8px 0 0 0; color:#475569; font-size:12px;">
            Calle de Ramos Carrión 5 Local 4, Madrid · España
        </p>

        <p style="margin:5px 0 0 0; color:#475569; font-size:12px;">
            contacto@posicionup.es
        </p>

    </div>

  </div>

</div>
`
                })
            }
        );

        // =========================
        // 🗑️ ELIMINAR SOLICITUD
        // =========================

        await fetch(
            `https://crm-backend-production-7e25.up.railway.app/solicitudes/${id}`,
            {
                method: "DELETE"
            }
        );

        // =========================
        // 🔥 ELIMINAR VISUALMENTE
        // =========================

        const card =
            document.getElementById(
                "solicitud-" + id
            );

        if (card) {

            card.remove();
        }

        // =========================
        // 🔥 RECARGAR SOLICITUDES
        // =========================

        await cargarSolicitudes();

        mostrarToast(
            "✅ Cita aceptada correctamente"
        );

    } catch (e) {

        console.error(
            "❌ Error aceptando solicitud:",
            e
        );
    }
}

// ===============================
// ❌ RECHAZAR SOLICITUD
// ===============================

window.rechazarSolicitud = async function (id) {

    try {

        const confirmar =
            confirm(
                "¿Rechazar esta solicitud?"
            );

        if (!confirmar) return;

        const res = await fetch(
            "https://crm-backend-production-7e25.up.railway.app/solicitudes"
        );

        const solicitudes =
            await res.json();

        const s =
            solicitudes.find(x => x.id == id);

        if (!s) return;

        // =========================
        // ✉️ ENVIAR EMAIL HTML
        // =========================

        await fetch(
            "https://crm-backend-production-7e25.up.railway.app/correo/enviar",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    para:
                        `${s.email},posicionup.agencia@gmail.com`,

                    asunto:
                        "❌ Solicitud de cita rechazada | PosicionUp",

                    mensaje: `

<div style="font-family:Arial, sans-serif; background:#020617; padding:40px 20px;">

  <div style="max-width:650px; margin:auto; background:#0f172a; border-radius:20px; overflow:hidden; border:1px solid #1e293b; box-shadow:0 20px 50px rgba(0,0,0,0.6);">

    <!-- HEADER -->
    <div style="padding:35px 25px; text-align:center; border-bottom:1px solid #1e293b;">

        <h1 style="color:#ef4444; margin:0; font-size:24px;">
            Solicitud rechazada
        </h1>

        <p style="color:#64748b; margin-top:8px; font-size:13px;">
            PosicionUp · Gestión inteligente de clientes
        </p>

    </div>

    <!-- CONTENIDO -->
    <div style="padding:30px; color:#e2e8f0; line-height:1.6;">

        <p style="margin-bottom:18px;">
            Hola ${s.cliente},
        </p>

        <p style="margin-bottom:18px; color:#cbd5f5;">
            Lamentablemente no hemos podido confirmar la cita solicitada.
        </p>

        <p style="margin-bottom:25px; color:#94a3b8;">
            Puedes volver a solicitar una nueva fecha u hora y estaremos encantados de atenderte.
        </p>

        <!-- BLOQUE INFO -->
        <div style="background:#020617; border:1px solid #1e293b; border-radius:14px; overflow:hidden;">

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    EVENTO
                </span>

                <span style="font-size:16px; font-weight:600; color:#f1f5f9;">
                    ${s.titulo}
                </span>

            </div>

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    FECHA
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.fecha}
                </span>

            </div>

            <div style="padding:16px 20px; border-bottom:1px solid #1e293b;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    HORA
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.hora}
                </span>

            </div>

            <div style="padding:16px 20px;">

                <span style="display:block; color:#38bdf8; font-size:12px; margin-bottom:6px;">
                    DESCRIPCIÓN
                </span>

                <span style="font-size:15px; font-weight:500; color:#e2e8f0;">
                    ${s.descripcion || "-"}
                </span>

            </div>

        </div>

        <p style="margin-top:30px; font-size:14px; color:#94a3b8;">
            Si necesitas ayuda o quieres reagendar tu cita, estaremos encantados de ayudarte.
        </p>

    </div>

    <!-- FOOTER -->
    <div style="padding:25px; text-align:center; border-top:1px solid #1e293b; background:#020617;">

        <p style="margin:0; color:#64748b; font-size:13px;">
            PosicionUp 🚀
        </p>

        <p style="margin:8px 0 0 0; color:#475569; font-size:12px;">
            Calle de Ramos Carrión 5 Local 4, Madrid · España
        </p>

        <p style="margin:5px 0 0 0; color:#475569; font-size:12px;">
            Email: contacto@posicionup.es
        </p>

    </div>

  </div>

</div>
`
                })
            }
        );

        // =========================
        // 🗑️ ELIMINAR SOLICITUD
        // =========================

        await fetch(
            `https://crm-backend-production-7e25.up.railway.app/solicitudes/${id}`,
            {
                method: "DELETE"
            }
        );

        // =========================
        // 🔥 ELIMINAR VISUALMENTE
        // =========================

        const card =
            document.getElementById(
                "solicitud-" + id
            );

        if (card) {

            card.remove();
        }

        // =========================
        // 🔥 RECARGAR
        // =========================

        await cargarSolicitudes();

        mostrarToast(
            "❌ Solicitud rechazada"
        );

    } catch (e) {

        console.error(
            "❌ Error rechazando solicitud:",
            e
        );
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

// cerrar al pulsar overlay
document.getElementById("overlay").addEventListener("click", cerrarMenu);

// cerrar al pulsar cualquier link del menú
function cerrarMenu() {
    document.getElementById("sidebar").classList.remove("active");
    document.getElementById("overlay").classList.remove("active");
}

document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", cerrarMenu);
});
document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    function cerrarMenu() {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }

    document.getElementById("overlay").addEventListener("click", cerrarMenu);

    document.querySelectorAll(".sidebar a").forEach(link => {
        link.addEventListener("click", cerrarMenu);
    });

});

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

// 🔥 CIERRE GLOBAL (clave)
document.addEventListener("click", function (e) {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    // Si clicas en overlay → cerrar
    if (e.target.id === "overlay") {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }

    // Si clicas en un link del menú → cerrar
    if (e.target.closest(".sidebar a")) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }

});

async function cargarCorreos() {
    try {
        const lista = document.getElementById("listaCorreos");
        if (!lista) return;

        lista.innerHTML = "Cargando...";

        const res = await fetch("https://crm-backend-production-7e25.up.railway.app/correo/bandeja");

        if (!res.ok) {
            throw new Error("Error HTTP: " + res.status);
        }

        let data = await res.json();

        console.log("📩 RESPUESTA API:", data);

        // 🔥 Soporta diferentes formatos backend
        let correos = Array.isArray(data) ? data : (data.correos || data.data || []);

        if (!Array.isArray(correos)) {
            console.error("Formato incorrecto:", correos);
            lista.innerHTML = "<p>Error cargando correos</p>";
            return;
        }

        // 🔥 ORDENAR (más nuevos primero)
        correos.sort((a, b) => {
            const fa = new Date(a.fecha || 0);
            const fb = new Date(b.fecha || 0);
            return fb - fa;
        });

        // 🔥 SI NO HAY CORREOS
        if (correos.length === 0) {
            lista.innerHTML = `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <div style="font-size:30px;">📭</div>
                    <p>No hay correos</p>
                </div>
            `;
            return;
        }

        // 🔥 GUARDAR GLOBAL (CLAVE)
        window.correos = correos;

        // 🔥 PINTAR LISTA
        lista.innerHTML = "";

        correos.forEach((c, i) => {

            const asunto = c.asunto || "(Sin asunto)";
            const de = c.de || "(Desconocido)";
            const fecha = c.fecha || "";

            lista.innerHTML += `
                <div class="correo-item" onclick="verCorreo(${i})">
                    <strong>${asunto}</strong><br>
                    <small>${de}</small><br>
                    <small style="color:gray">${fecha}</small>
                </div>
            `;
        });

    } catch (e) {
        console.error("❌ Error cargando correos:", e);

        const lista = document.getElementById("listaCorreos");
        if (lista) {
            lista.innerHTML = `
                <div style="color:red; padding:20px;">
                    Error cargando correos
                </div>
            `;
        }
    }
}

function mostrarToast(mensaje, tipo = "success") {

    const toastContainer =
        document.getElementById("toast");

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${tipo}`;

    toast.innerText = mensaje;

    toastContainer.appendChild(toast);

    setTimeout(() => {

        toast.remove();

    }, 3000);
}

async function login() {

    const username =
        document.getElementById("loginUser").value;

    const password =
        document.getElementById("loginPass").value;

    try {

        const res = await fetch(
           "https://crm-backend-production-7e25.up.railway.app/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        if (!res.ok) {

            throw new Error(
                "Login incorrecto"
            );
        }

        const usuario =
            await res.json();

        // 💾 GUARDAR SESIÓN

        localStorage.setItem(
            "usuario",
            JSON.stringify(usuario)
        );

        mostrarToast(
            "✅ Bienvenido " +
            usuario.nombre
        );

        // 🔥 ENTRAR CRM

        location.reload();

    } catch (e) {

        console.error(e);

        mostrarToast(
            "❌ Usuario o contraseña incorrectos",
            "error"
        );
    }
}

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("/service-worker.js")

            .then(reg => {

                console.log(
                    "✅ Service Worker OK",
                    reg
                );
            })

            .catch(err => {

                console.error(
                    "❌ Error Service Worker",
                    err
                );
            });
    });
}

