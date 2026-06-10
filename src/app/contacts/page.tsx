"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/stores";
import { Analytics } from "@/lib/analytics/novus";
import type { TrustedContact } from "@/lib/types";

const ROLES = [
  { id: "first_responder", label: "First Responder", desc: "Gets all alerts immediately", emoji: "🚨" },
  { id: "silent_watcher", label: "Silent Watcher", desc: "Sees location, not alerted", emoji: "👁️" },
  { id: "emergency_only", label: "Emergency Only", desc: "Only contacted in extreme SOS", emoji: "🆘" },
];

const RELATIONSHIPS = ["Mother", "Father", "Sister", "Brother", "Partner", "Friend", "Colleague", "Other"];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<TrustedContact | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Friend");
  const [role, setRole] = useState<"first_responder" | "silent_watcher" | "emergency_only">("first_responder");
  const [alertMethod, setAlertMethod] = useState<"sms" | "whatsapp" | "email" | "all">("all");

  const supabase = createClient();
  const { setContacts: setStoreContacts } = useUserStore();

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    const { data } = await supabase.from("trusted_contacts").select("*").order("priority");
    const c = (data ?? []) as TrustedContact[];
    setContacts(c);
    setStoreContacts(c);
  };

  const openAdd = () => {
    setEditContact(null);
    setName(""); setPhone(""); setEmail(""); setRelationship("Friend");
    setRole("first_responder"); setAlertMethod("all");
    setShowForm(true);
  };

  const openEdit = (c: TrustedContact) => {
    setEditContact(c);
    setName(c.name); setPhone(c.phone); setEmail(c.email ?? "");
    setRelationship(c.relationship); setRole(c.role as any); setAlertMethod(c.alert_method as any);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim() || !phone.trim()) return;
    setIsSaving(true);
    const payload = { name, phone, email: email || null, relationship, role, alert_method: alertMethod };

    if (editContact) {
      await supabase.from("trusted_contacts").update(payload).eq("id", editContact.id);
    } else {
      const priority = contacts.length + 1;
      await supabase.from("trusted_contacts").insert({ ...payload, priority });
    }

    await loadContacts();
    setShowForm(false);
    if (!editContact) Analytics.contactAdded(role);
    setIsSaving(false);
  };

  const remove = async (id: string) => {
    await supabase.from("trusted_contacts").delete().eq("id", id);
    await loadContacts();
  };

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col pb-safe">
      {/* Header */}
      <div className="pt-safe px-5 pt-5 pb-4 border-b border-white/5 flex items-center">
        <div>
          <h1 className="font-display font-bold text-white text-xl">Trusted Circle</h1>
          <p className="text-night-500 text-xs mt-0.5">{contacts.length}/10 contacts</p>
        </div>
        {contacts.length < 10 && (
          <button
            onClick={openAdd}
            className="ml-auto w-9 h-9 rounded-full bg-shield-500 flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m-7-7h14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      <div className="flex-1 px-4 py-4">
        {contacts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-night-400 font-medium">No contacts yet</p>
            <p className="text-night-600 text-sm mt-1">Add people who should be alerted in an emergency</p>
            <button onClick={openAdd} className="btn-primary mt-6 px-8">Add first contact</button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, idx) => {
              const roleInfo = ROLES.find((r) => r.id === contact.role)!;
              return (
                <motion.div
                  key={contact.id}
                  className="bg-night-800 rounded-2xl p-4 border border-white/5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-shield-500/20 border border-shield-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{roleInfo.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-base">{contact.name}</h3>
                        <span className="text-night-600 text-xs">#{contact.priority}</span>
                      </div>
                      <p className="text-night-400 text-sm">{contact.phone}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-night-700 text-night-400">{contact.relationship}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-shield-500/10 text-shield-400">{roleInfo.label}</span>
                        <span className="text-xs text-night-600 uppercase">{contact.alert_method}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(contact)} className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#A5A5A5" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button onClick={() => remove(contact.id)} className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-night-900 rounded-t-3xl px-5 pt-6 pb-safe pb-8 border-t border-white/10 overflow-y-auto max-h-[90dvh]"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <h2 className="font-display font-bold text-white text-lg mb-5">
                {editContact ? "Edit Contact" : "Add Contact"}
              </h2>
              <div className="space-y-4">
                <input className="input-dark" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="input-dark" placeholder="Phone number *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <input className="input-dark" placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Relationship</p>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIPS.map((r) => (
                      <button key={r} onClick={() => setRelationship(r)}
                        className={`px-3 py-1.5 rounded-full text-sm ${relationship === r ? "bg-shield-500 text-white" : "bg-night-800 text-night-400 border border-white/10"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Role</p>
                  <div className="space-y-2">
                    {ROLES.map((r) => (
                      <button key={r.id} onClick={() => setRole(r.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${role === r.id ? "bg-shield-500/10 border-shield-500/30 text-white" : "bg-night-800 border-white/5 text-night-400"}`}>
                        <span className="text-xl">{r.emoji}</span>
                        <div className="text-left">
                          <p className="font-medium text-sm">{r.label}</p>
                          <p className="text-xs opacity-60">{r.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Alert via</p>
                  <div className="flex gap-2">
                    {["sms", "whatsapp", "email", "all"].map((m) => (
                      <button key={m} onClick={() => setAlertMethod(m as any)}
                        className={`flex-1 py-2 rounded-xl text-xs uppercase font-medium ${alertMethod === m ? "bg-shield-500 text-white" : "bg-night-800 text-night-400"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={save} disabled={!name || !phone || isSaving} className="btn-primary w-full disabled:opacity-40">
                  {isSaving ? "Saving..." : editContact ? "Save Changes" : "Add Contact"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
