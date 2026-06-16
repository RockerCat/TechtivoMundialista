import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import SnapshotDownloadButton from "@/components/admin/SnapshotDownloadButton";

export default function AdminSecurityPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-8 space-y-6">
      <div>
        <p className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest mb-1">
          Admin · Seguridad
        </p>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Seguridad</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">
          Actualiza la contraseña de tu cuenta administradora.
        </p>
      </div>

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
        <ChangePasswordForm />
      </div>

      <div>
        <h2 className="text-sm font-bold text-[#f1f5f9]">Backup de datos</h2>
        <p className="text-xs text-[#94a3b8] mt-0.5 mb-4">
          Descarga un snapshot JSON de toda la información funcional (equipos, partidos,
          pronósticos, usuarios, grupos y noticias). No incluye contraseñas ni secretos.
        </p>
      </div>

      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
        <SnapshotDownloadButton />
      </div>
    </div>
  );
}
