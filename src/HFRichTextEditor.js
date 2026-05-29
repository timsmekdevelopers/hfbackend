import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

export default function HFRichTextEditor({ value, onChange, minHeight = 240 }) {
  return (
    <div style={{ border: '1px solid #d5d9e5', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <Editor
        tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6.8.6/tinymce.min.js"
        value={value}
        onEditorChange={(nextValue) => onChange(nextValue)}
        init={{
          height: minHeight,
          menubar: 'file edit view insert format tools table',
          branding: false,
          promotion: false,
          plugins: [
            'advlist',
            'anchor',
            'autolink',
            'autosave',
            'charmap',
            'code',
            'fullscreen',
            'image',
            'insertdatetime',
            'link',
            'lists',
            'media',
            'preview',
            'searchreplace',
            'table',
            'visualblocks',
            'wordcount'
          ],
          toolbar:
            'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table image media link | ' +
            'removeformat code preview fullscreen',
          content_style:
            'body { font-family: Georgia, Cambria, serif; font-size: 15px; line-height: 1.7; margin: 1rem; color: #20263a; } ' +
            'h1,h2,h3,h4 { color: #1f2f66; } table { border-collapse: collapse; width: 100%; } ' +
            'table td, table th { border: 1px solid #cfd6ea; padding: 8px; }',
          paste_as_text: false,
          toolbar_sticky: true,
          toolbar_sticky_offset: 0,
          resize: true,
          statusbar: true,
          browser_spellcheck: true,
          contextmenu: 'link image table',
          image_title: true,
          automatic_uploads: false
        }}
      />
    </div>
  );
}
