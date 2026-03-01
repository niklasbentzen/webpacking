import React, { useEffect, useRef } from "react";
import OverType, { toolbarButtons } from "overtype";
import { ImageIcon } from "@phosphor-icons/react";

function insertAtCursor(hostEl, text) {
  const textarea = hostEl?.querySelector("textarea");
  if (!textarea) return false;

  textarea.focus();

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;

  textarea.setRangeText(text, start, end, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

export default function OverTypeEditor({
  value,
  onChange,
  onSave,
  onUploadImage, // async (file) => url
  height = "100%",
  toolbar = true,
  ...rest
}) {
  const hostRef = useRef(null);
  const fileInputRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const onUploadImageRef = useRef(onUploadImage);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onUploadImageRef.current = onUploadImage;
  }, [onUploadImage]);

  useEffect(() => {
    const [instance] = OverType.init(hostRef.current, {
      value,
      onChange,
      toolbar,
      theme: "auto",

      // ✅ Enables drag/drop + paste insertion
      fileUpload: {
        enabled: true,
        maxSize: 10 * 1024 * 1024,
        onInsertFile: async (file) => {
          const upload = onUploadImageRef.current;
          if (!upload) throw new Error("onUploadImage prop missing");

          const url = await upload(file);
          if (!url) throw new Error("No URL returned from onUploadImage");

          const isImage = file.type?.startsWith("image/");
          return isImage ? `![${file.name}](${url})` : `[${file.name}](${url})`;
        },
      },

      toolbarButtons: [
        {
          name: "save",
          title: "Save",
          icon: `<svg viewBox="0 0 18 18"><path stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14,16H4a1,1,0,0,1-1-1V3A1,1,0,0,1,4,2h7.5L15,5.5V15A1,1,0,0,1,14,16Z"></path><polyline stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" points="12 16 12 10 6 10 6 16"></polyline><polyline stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" points="6 2 6 6 11 6"></polyline></svg>`,
          action: async () => onSaveRef.current?.(),
        },
        toolbarButtons.separator,
        toolbarButtons.bold,
        toolbarButtons.italic,
        toolbarButtons.separator,

        {
          name: "upload",
          title: "Upload",
          icon: `<svg width="216" height="184" viewBox="0 0 216 184" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M124 60C124 56.8355 124.938 53.7421 126.696 51.1109C128.455 48.4797 130.953 46.4289 133.877 45.2179C136.801 44.0069 140.018 43.6901 143.121 44.3074C146.225 44.9248 149.076 46.4487 151.314 48.6863C153.551 50.9239 155.075 53.7749 155.693 56.8786C156.31 59.9823 155.993 63.1993 154.782 66.1229C153.571 69.0466 151.52 71.5454 148.889 73.3035C146.258 75.0616 143.165 76 140 76C135.757 76 131.687 74.3143 128.686 71.3137C125.686 68.3131 124 64.2435 124 60ZM216 20V164C216 169.304 213.893 174.391 210.142 178.142C206.391 181.893 201.304 184 196 184H20C14.6957 184 9.60859 181.893 5.85786 178.142C2.10714 174.391 0 169.304 0 164V20C0 14.6957 2.10714 9.60859 5.85786 5.85786C9.60859 2.10714 14.6957 0 20 0H196C201.304 0 206.391 2.10714 210.142 5.85786C213.893 9.60859 216 14.6957 216 20ZM24 24V103.72L57.86 69.86C61.6106 66.1106 66.6967 64.0043 72 64.0043C77.3033 64.0043 82.3894 66.1106 86.14 69.86L127.31 111L144.49 93.83C148.241 90.0806 153.327 87.9743 158.63 87.9743C163.933 87.9743 169.019 90.0806 172.77 93.83L192 113.09V24H24ZM24 160H142.34L72 89.66L24 137.66V160ZM192 160V147L158.63 113.63L144.28 128L176.28 160H192Z"/></svg>`,
          action: () => {
            if (isUploadingRef.current) return;
            fileInputRef.current?.click();
          },
        },

        toolbarButtons.link,
        toolbarButtons.separator,
        toolbarButtons.h1,
        toolbarButtons.h2,
        toolbarButtons.separator,
        toolbarButtons.bulletList,
        toolbarButtons.orderedList,
        toolbarButtons.separator,
        toolbarButtons.viewMode,
      ],

      ...rest,
    });

    return () => instance?.destroy?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const upload = onUploadImageRef.current;
    if (!upload) return;

    try {
      isUploadingRef.current = true;
      const url = await upload(file);
      if (!url) throw new Error("No URL returned from onUploadImage");

      const md = file.type?.startsWith("image/")
        ? `![${file.name}](${url})`
        : `[${file.name}](${url})`;

      // ✅ insert at caret
      insertAtCursor(hostRef.current, md);
    } finally {
      isUploadingRef.current = false;
    }
  };

  return (
    <>
      <div ref={hostRef} style={{ height }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        style={{ display: "none" }}
      />
    </>
  );
}
