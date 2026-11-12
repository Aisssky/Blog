/**
 * Fabric.js 绘图编辑器（模态层）。
 *
 * 支持：矩形 / 圆 / 椭圆 / 直线 / 箭头 / 自由画笔 / 文本 / 图片，
 * 填充色、边框色、边框粗细、文字色、字号、对象移动/缩放/旋转/删除/复制、
 * 撤销/重做、画布背景色与尺寸。
 *
 * 保存时同时产出：
 *   - fabricJson：可二次编辑的完整画布数据
 *   - svg：最终展示资源
 * 绝不只导出图片而丢弃原始对象。
 *
 * 依赖由 owner.ts 动态 import 加载，普通访客不会下载 Fabric。
 */
import {
  Canvas,
  Rect,
  Circle,
  Ellipse,
  Line,
  Textbox,
  Triangle,
  FabricImage,
  PencilBrush,
  Group,
  type FabricObject,
} from 'fabric';
import type { DrawingData } from '../../lib/editor-types';

export interface DrawingResult {
  fabricJson: Record<string, unknown>;
  svg: string;
  width: number;
  height: number;
}

interface DrawingEditorOptions {
  onSave: (r: DrawingResult) => void;
  onClose: () => void;
  initial?: DrawingData;
}

const STYLE = `
.drawing-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,22,28,.72);
  display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;}
.drawing-modal{background:#fff;border-radius:14px;width:min(1100px,96vw);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);}
.drawing-toolbar{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;border-bottom:1px solid #ececf1;align-items:center;}
.drawing-toolbar button{font-size:13px;padding:6px 10px;border:1px solid #d7d7df;border-radius:8px;background:#f7f7fa;cursor:pointer;}
.drawing-toolbar button.active{background:#3b5bdb;color:#fff;border-color:#3b5bdb;}
.drawing-toolbar .sep{width:1px;height:22px;background:#e3e3e8;margin:0 4px;}
.drawing-toolbar label{font-size:12px;color:#555;display:flex;align-items:center;gap:4px;}
.drawing-stage{flex:1;overflow:auto;background:#f1f2f5;display:flex;align-items:center;justify-content:center;padding:16px;}
.drawing-stage canvas{max-width:100%;height:auto;box-shadow:0 2px 12px rgba(0,0,0,.12);background:#fff;}
.drawing-footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #ececf1;}
.drawing-footer button{font-size:14px;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid transparent;}
.drawing-footer .primary{background:#3b5bdb;color:#fff;}
.drawing-footer .ghost{background:#fff;border-color:#d7d7df;color:#333;}
`;

export class DrawingEditor {
  private overlay!: HTMLDivElement;
  private canvas!: Canvas;
  private mode: 'select' | 'rect' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'pen' | 'text' = 'select';
  private history: string[] = [];
  private redoStack: string[] = [];
  private opts: DrawingEditorOptions;
  private startPoint: { x: number; y: number } | null = null;
  private defaults = { fill: '#ffd43b', stroke: '#343a40', strokeWidth: 2, textColor: '#212529', fontSize: 24 };

  constructor(opts: DrawingEditorOptions) {
    this.opts = opts;
  }

  open(): void {
    if (document.getElementById('drawing-overlay-style') === null) {
      const s = document.createElement('style');
      s.id = 'drawing-overlay-style';
      s.textContent = STYLE;
      document.head.appendChild(s);
    }
    this.buildDom();
  }

  close(): void {
    this.overlay.remove();
    this.opts.onClose();
  }

  private buildDom(): void {
    const initial = this.opts.initial;
    const w = initial?.width ?? 1200;
    const h = initial?.height ?? 800;

    this.overlay = document.createElement('div');
    this.overlay.className = 'drawing-overlay';
    this.overlay.innerHTML = `
      <div class="drawing-modal">
        <div class="drawing-toolbar">
          <button data-mode="select" class="active">选择</button>
          <button data-mode="rect">矩形</button>
          <button data-mode="circle">圆</button>
          <button data-mode="ellipse">椭圆</button>
          <button data-mode="line">直线</button>
          <button data-mode="arrow">箭头</button>
          <button data-mode="pen">画笔</button>
          <button data-mode="text">文本</button>
          <span class="sep"></span>
          <label>填充<input type="color" id="d-fill" value="${this.defaults.fill}"></label>
          <label>描边<input type="color" id="d-stroke" value="${this.defaults.stroke}"></label>
          <label>粗细<input type="number" id="d-sw" value="${this.defaults.strokeWidth}" min="1" max="40" style="width:52px"></label>
          <label>文字色<input type="color" id="d-tc" value="${this.defaults.textColor}"></label>
          <label>字号<input type="number" id="d-fs" value="${this.defaults.fontSize}" min="8" max="120" style="width:52px"></label>
          <span class="sep"></span>
          <button id="d-img">图片</button>
          <button id="d-del">删除</button>
          <button id="d-dup">复制</button>
          <button id="d-undo">撤销</button>
          <button id="d-redo">重做</button>
          <span class="sep"></span>
          <label>背景<input type="color" id="d-bg" value="#ffffff"></label>
          <label>宽<input type="number" id="d-cw" value="${w}" style="width:64px"></label>
          <label>高<input type="number" id="d-ch" value="${h}" style="width:64px"></label>
        </div>
        <div class="drawing-stage"><canvas id="d-canvas"></canvas></div>
        <div class="drawing-footer">
          <button class="ghost" id="d-cancel">取消</button>
          <button class="primary" id="d-save">保存绘图</button>
        </div>
      </div>`;
    document.body.appendChild(this.overlay);

    this.canvas = new Canvas('d-canvas', { width: w, height: h, backgroundColor: '#ffffff' });

    // 工具按钮
    this.overlay.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode as any);
        this.overlay.querySelectorAll('button[data-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const byId = (id: string) => this.overlay.querySelector<HTMLInputElement>('#' + id)!;
    byId('d-fill').addEventListener('input', (e) => this.defaults.fill = (e.target as HTMLInputElement).value);
    byId('d-stroke').addEventListener('input', (e) => { this.defaults.stroke = (e.target as HTMLInputElement).value; this.applyToActive('stroke', this.defaults.stroke); });
    byId('d-sw').addEventListener('input', (e) => { this.defaults.strokeWidth = Number((e.target as HTMLInputElement).value); this.applyToActive('strokeWidth', this.defaults.strokeWidth); });
    byId('d-tc').addEventListener('input', (e) => { this.defaults.textColor = (e.target as HTMLInputElement).value; this.applyToActive('fill', this.defaults.textColor); });
    byId('d-fs').addEventListener('input', (e) => { this.defaults.fontSize = Number((e.target as HTMLInputElement).value); this.applyToActive('fontSize', this.defaults.fontSize); });
    byId('d-bg').addEventListener('input', (e) => { this.canvas.backgroundColor = (e.target as HTMLInputElement).value; this.canvas.renderAll(); });
    byId('d-cw').addEventListener('change', () => this.resize());
    byId('d-ch').addEventListener('change', () => this.resize());

    byId('d-img').addEventListener('click', () => this.insertImage());
    this.overlay.querySelector('#d-del')!.addEventListener('click', () => this.deleteActive());
    this.overlay.querySelector('#d-dup')!.addEventListener('click', () => this.duplicateActive());
    this.overlay.querySelector('#d-undo')!.addEventListener('click', () => this.undo());
    this.overlay.querySelector('#d-redo')!.addEventListener('click', () => this.redo());
    this.overlay.querySelector('#d-cancel')!.addEventListener('click', () => this.close());
    this.overlay.querySelector('#d-save')!.addEventListener('click', () => this.save());

    this.canvas.on('mouse:down', (opt) => this.onMouseDown(opt));
    this.canvas.on('mouse:move', (opt) => this.onMouseMove(opt));
    this.canvas.on('mouse:up', () => this.onMouseUp());
    this.canvas.on('object:modified', () => this.snapshot());

    if (initial?.fabricJson) {
      this.canvas.loadFromJSON(initial.fabricJson as any).then(() => {
        this.canvas.renderAll();
        this.snapshot();
      });
    } else {
      this.snapshot();
    }
  }

  private resize(): void {
    const w = Number((this.overlay.querySelector('#d-cw') as HTMLInputElement).value) || 1200;
    const h = Number((this.overlay.querySelector('#d-ch') as HTMLInputElement).value) || 800;
    this.canvas.setDimensions({ width: w, height: h });
  }

  private setMode(mode: typeof this.mode): void {
    this.mode = mode;
    this.canvas.isDrawingMode = mode === 'pen';
    if (mode === 'pen') {
      this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
      this.canvas.freeDrawingBrush.width = this.defaults.strokeWidth;
      this.canvas.freeDrawingBrush.color = this.defaults.stroke;
    }
    this.canvas.defaultCursor = mode === 'select' ? 'default' : 'crosshair';
    this.canvas.selection = mode === 'select';
  }

  private applyToActive(key: string, value: unknown): void {
    const obj = this.canvas.getActiveObject();
    if (obj) {
      (obj as any).set(key as any, value);
      this.canvas.renderAll();
    }
  }

  private onMouseDown(opt: any): void {
    if (this.mode === 'select' || this.mode === 'pen') return;
    const p = this.canvas.getPointer(opt.e);
    this.startPoint = { x: p.x, y: p.y };
  }

  private onMouseMove(opt: any): void {
    if (!this.startPoint || this.mode === 'select' || this.mode === 'pen') return;
    const p = this.canvas.getPointer(opt.e);
    // 拖拽预览：移动时实时更新当前正在创建的对象
    this.previewShape(p);
  }

  private onMouseUp(): void {
    if (!this.startPoint) return;
    // 已在 mouse:down 创建好对象，这里仅收尾
    this.startPoint = null;
  }

  private previewShape(p: { x: number; y: number }): void {
    const s = this.startPoint!;
    const w = Math.abs(p.x - s.x);
    const h = Math.abs(p.y - s.y);
    const left = Math.min(s.x, p.x);
    const top = Math.min(s.y, p.y);
    const common = { fill: this.mode === 'line' || this.mode === 'arrow' ? 'transparent' : this.defaults.fill, stroke: this.defaults.stroke, strokeWidth: this.defaults.strokeWidth, selectable: true };
    let obj: FabricObject;
    switch (this.mode) {
      case 'rect':
        obj = new Rect({ left, top, width: w, height: h, ...common });
        break;
      case 'circle':
        obj = new Circle({ left, top, radius: Math.max(w, h) / 2, ...common });
        break;
      case 'ellipse':
        obj = new Ellipse({ left, top, rx: w / 2, ry: h / 2, ...common });
        break;
      case 'line':
      case 'arrow': {
        obj = new Line([s.x, s.y, p.x, p.y], { stroke: this.defaults.stroke, strokeWidth: this.defaults.strokeWidth });
        if (this.mode === 'arrow') obj = this.withArrowHead(obj, s, p);
        break;
      }
      case 'text':
        obj = new Textbox('双击编辑文字', { left: s.x, top: s.y, fontSize: this.defaults.fontSize, fill: this.defaults.textColor, width: 240 });
        break;
      default:
        return;
    }
    // 移除上一个预览，加入新预览
    const active = this.canvas.getActiveObject();
    if (active && (active as any)._isPreview) this.canvas.remove(active);
    (obj as any)._isPreview = true;
    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
  }

  private withArrowHead(line: Line, s: { x: number; y: number }, e: { x: number; y: number }): Group {
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const size = 16 + this.defaults.strokeWidth * 2;
    const head = new Triangle({
      left: e.x,
      top: e.y,
      originX: 'center',
      originY: 'center',
      width: size,
      height: size,
      fill: this.defaults.stroke,
      angle: (angle * 180) / Math.PI + 90,
    });
    const group = new Group([line, head], { left: Math.min(s.x, e.x), top: Math.min(s.y, e.y) });
    return group;
  }

  private insertImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      img.set({ left: 40, top: 40, scaleX: 0.5, scaleY: 0.5 });
      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.renderAll();
      this.snapshot();
    };
    input.click();
  }

  private deleteActive(): void {
    const objs = this.canvas.getActiveObjects();
    objs.forEach((o) => this.canvas.remove(o));
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.snapshot();
  }

  private async duplicateActive(): Promise<void> {
    const obj = this.canvas.getActiveObject();
    if (!obj) return;
    const cloned = await obj.clone();
    cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
    this.canvas.add(cloned);
    this.canvas.setActiveObject(cloned);
    this.canvas.renderAll();
    this.snapshot();
  }

  private snapshot(): void {
    this.history.push(JSON.stringify(this.canvas.toJSON()));
    this.redoStack = [];
    if (this.history.length > 60) this.history.shift();
  }

  private undo(): void {
    if (this.history.length <= 1) return;
    const current = this.history.pop()!;
    this.redoStack.push(current);
    const prev = this.history[this.history.length - 1];
    this.canvas.loadFromJSON(JSON.parse(prev)).then(() => this.canvas.renderAll());
  }

  private redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.history.push(next);
    this.canvas.loadFromJSON(JSON.parse(next)).then(() => this.canvas.renderAll());
  }

  private save(): void {
    const json = this.canvas.toJSON();
    const svg = this.canvas.toSVG();
    const dims = this.canvas.getDimensions();
    this.opts.onSave({ fabricJson: json as Record<string, unknown>, svg, width: dims.width, height: dims.height });
  }
}
