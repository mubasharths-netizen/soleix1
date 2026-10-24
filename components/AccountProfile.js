"use client";

import { useActionState, useId, useState } from "react";
import { deleteAddressAction, saveAddressAction, saveProfileAction, setDefaultAddressAction } from "@/lib/account-actions";

const EMPTY = { label: "Home", full_name: "", phone: "", address: "", city: "", postal_code: "", isDefault: false };

function Field({ id, label, name, value, onChange, type = "text", wide = false, required = false, maxLength = 200, placeholder = "" }) {
  return (
    <div className={`field${wide ? " checkout-span" : ""}`}>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        className="auth-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

function Result({ state }) {
  if (state.error) return <p className="auth-error" role="alert">{state.error}</p>;
  if (state.saved) return <p className="auth-success" role="status">{state.saved}</p>;
  return null;
}

export default function AccountProfile({ kind, initial, addresses }) {
  const uid = useId();
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(0);
  const [confirmId, setConfirmId] = useState(0);
  const [profile, setProfile] = useState({ full_name: initial.full_name || "", phone: initial.phone || "" });

  const [profileState, submitProfile, profilePending] = useActionState(async (_previous, form) => (await saveProfileAction(form)) || {}, {});
  const [addressState, submitAddress, addressPending] = useActionState(async (_previous, form) => {
    const result = await saveAddressAction(form);
    if (result?.saved) { setEditing(false); setEditId(0); setDraft(EMPTY); }
    return result || {};
  }, {});
  const [otherState, submitOther, otherPending] = useActionState(async (_previous, form) => {
    const result = form.get("make_default") ? await setDefaultAddressAction(form) : await deleteAddressAction(form);
    if (result?.saved) {
      setConfirmId(0);
      if (Number(form.get("id")) === editId) { setEditing(false); setEditId(0); setDraft(EMPTY); }
    }
    return result || {};
  }, {});

  function startEdit(address) {
    setEditing(true);
    setEditId(address.id);
    setConfirmId(0);
    setDraft({
      label: address.label || "Home",
      full_name: address.full_name || "",
      phone: address.phone || "",
      address: address.address || "",
      city: address.city || "",
      postal_code: address.postal_code || "",
      isDefault: !!address.is_default,
    });
  }

  const set = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const closeForm = () => { setEditing(false); setEditId(0); setDraft(EMPTY); };

  return (
    <div className="profile-layout">
      <section className="panel">
        <div className="panel-head">
          <h2>Your details</h2>
        </div>
        <p className="sample-note">The shop calls this number before an order ships. {kind === "staff" ? "This is your staff display name." : "Your email comes from your sign-in and cannot be typed here."}</p>
        <form action={submitProfile} className="form-grid">
          <Field id={`${uid}-name`} label="Full name" name="full_name" value={profile.full_name} onChange={(value) => setProfile((current) => ({ ...current, full_name: value }))} required maxLength={120} />
          <Field id={`${uid}-phone`} label="Phone" name="phone" value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} maxLength={32} placeholder="+92 300 0000000" />
          <div className="field checkout-span">
            <label className="auth-label" htmlFor={`${uid}-email`}>Email (from your sign-in)</label>
            <input id={`${uid}-email`} className="auth-input" value={initial.email} readOnly />
          </div>
          <div className="checkout-span"><Result state={profileState} /></div>
          <div className="form-actions checkout-span">
            <button type="submit" className="button button-dark" disabled={profilePending}>{profilePending ? "Saving…" : "Save details"}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Delivery addresses</h2>
          {kind === "customer" && addresses.length > 0 && (
            <button type="button" className="link-button" onClick={() => (editing ? closeForm() : setEditing(true))}>{editing ? "Close" : "+ Add another"}</button>
          )}
        </div>
        <Result state={otherState} />

        {kind === "staff" ? (
          <p className="auth-notice">Saved addresses belong to a customer account. Place an order as a customer to build an address book.</p>
        ) : !addresses.length ? (
          <p className="sample-note">No saved addresses yet. Add one and checkout will fill it in for you.</p>
        ) : (
          <ul className="address-list">
            {addresses.map((address) => (
              <li className="address-item" key={address.id}>
                <h3>
                  {address.label}
                  {address.is_default ? <span className="badge badge-ok">Default</span> : null}
                </h3>
                <p>{address.full_name}{address.phone ? ` · ${address.phone}` : ""}<br />{address.address}{address.city ? `, ${address.city}` : ""}{address.postal_code ? ` ${address.postal_code}` : ""}</p>
                <div className="address-actions">
                  <button type="button" className="link-button" onClick={() => startEdit(address)}>Edit</button>
                  {!address.is_default && (
                    <form action={submitOther}>
                      <input type="hidden" name="id" value={address.id} />
                      <input type="hidden" name="make_default" value="1" />
                      <button type="submit" className="link-button" disabled={otherPending}>Make default</button>
                    </form>
                  )}
                  {confirmId === address.id ? (
                    <form action={submitOther} className="form-actions">
                      <input type="hidden" name="id" value={address.id} />
                      <button type="submit" className="link-button is-danger" disabled={otherPending}>Confirm remove</button>
                      <button type="button" className="link-button" onClick={() => setConfirmId(0)}>Keep</button>
                    </form>
                  ) : (
                    <button type="button" className="link-button is-danger" onClick={() => setConfirmId(address.id)}>Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {kind === "customer" && (editing || !addresses.length) && (
          <form action={submitAddress} className="form-grid">
            <h3 className="checkout-span panel-subhead">{editing ? "Edit address" : "New address"}</h3>
            {editing && <input type="hidden" name="id" value={editId} />}
            <Field id={`${uid}-label`} label="Label" name="label" value={draft.label} onChange={set("label")} maxLength={40} placeholder="Home, Office…" />
            <Field id={`${uid}-aname`} label="Full name" name="full_name" value={draft.full_name} onChange={set("full_name")} required maxLength={120} />
            <Field id={`${uid}-aphone`} label="Phone" name="phone" value={draft.phone} onChange={set("phone")} maxLength={32} />
            <Field id={`${uid}-acity`} label="City" name="city" value={draft.city} onChange={set("city")} required maxLength={80} />
            <Field id={`${uid}-apostal`} label="Postal code" name="postal_code" value={draft.postal_code} onChange={set("postal_code")} maxLength={24} />
            <div className="field checkout-span">
              <label className="auth-label" htmlFor={`${uid}-aaddress`}>Complete delivery address</label>
              <textarea id={`${uid}-aaddress`} name="address" className="auth-input" rows={3} maxLength={260} required value={draft.address} onChange={(event) => set("address")(event.target.value)} placeholder="House / flat, street, area, landmark" />
            </div>
            <label className="checkbox-row checkout-span">
              <input type="checkbox" name="is_default" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
              Use as my default delivery address
            </label>
            <Result state={addressState} />
            <div className="form-actions checkout-span">
              <button type="submit" className="button button-dark" disabled={addressPending}>{addressPending ? "Saving…" : editing ? "Update address" : "Save address"}</button>
              {editing && <button type="button" className="button button-ghost" onClick={closeForm}>Cancel</button>}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
