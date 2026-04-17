import { pb } from "./pb";

export async function optimizeImage(
  file,
  {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.8,
    type = "image/jpeg",
  } = {}
) {
  const img = await loadImage(file);

  let { width, height } = img;

  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );

  return new File([blob], file.name, { type });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadStageImage(stageId, file) {
  const optimized = await optimizeImage(file, {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.7,
    type: "image/jpeg",
  });

  const form = new FormData();
  form.append("images+", optimized);

  const updated = await pb.collection("stages").update(stageId, form);

  const filename = updated.images[updated.images.length - 1];
  const url = pb.files.getURL(updated, filename);

  return { url, filename, record: updated };
}

export async function deleteStageImage(stageId, filename) {
  return pb.collection("stages").update(stageId, { "images-": filename });
}
