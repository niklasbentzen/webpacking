import s from "../../pages/admin/Admin.module.css";
import { useState } from "react";
import OverTypeEditor from "../OverTypeEditor/OverTypeEditor";

export default function AdminMarkdownEditor({ value, onChange }) {
  return (
    <>
      <OverTypeEditor value={value} onChange={onChange} />
    </>
  );
}
