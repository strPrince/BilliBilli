import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { Edit3, FileDown, Share2, CheckCircle, Edit2, Trash2, Plus, Calendar, MapPin, User, Phone } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function OrderReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);

  const order = useLiveQuery(() => db.orders.get(orderId), [orderId]);
  const items = useLiveQuery(() => db.orderItems.where('orderId').equals(orderId).toArray(), [orderId]);
  const profile = useLiveQuery(() => db.businessProfile.get(1));

  const [isExporting, setIsExporting] = useState(false);

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1).toUpperCase();
  };

  const uiText = {
    confirmDelete: '\u0AB6\u0AC1\u0A82 \u0AA4\u0AAE\u0AC7',
    confirmDeleteSuffix: '\u0A95\u0ABE\u0AA2\u0AC0 \u0AA6\u0AC7\u0AB5\u0ABE \u0AAE\u0ABE\u0A82\u0A97\u0ACB \u0A9B\u0ACB?',
    date: '\u0AA4\u0ABE\u0AB0\u0AC0\u0A96',
    eventType: '\u0AAA\u0ACD\u0AB0\u0AB8\u0A82\u0A97 \u0AAA\u0ACD\u0AB0\u0A95\u0ABE\u0AB0',
    morning: '\u0AB8\u0AB5\u0ABE\u0AB0\u0AC7',
    afternoon: '\u0AAC\u0AAA\u0ACB\u0AB0\u0AC7',
    evening: '\u0AB8\u0ABE\u0A82\u0A9C\u0AC7',
    items: '\u0AB5\u0AB8\u0ACD\u0AA4\u0AC1\u0A93',
    noItems: '\u0A95\u0ACB\u0A88 \u0AB5\u0AB8\u0ACD\u0AA4\u0AC1 \u0AA8\u0AA5\u0AC0',
    kilo: '\u0A95\u0ABF\u0AB2\u0ACB',
    gram: '\u0A97\u0ACD\u0AB0\u0ABE\u0AAE',
    notes: '\u0AA8\u0ACB\u0A82\u0AA7',
    backHome: '\u0AB9\u0ACB\u0AAE \u0AAA\u0AB0 \u0AAA\u0ABE\u0A9B\u0ABE \u0AAB\u0AB0\u0ACB',
    completeOrder: '\u0A93\u0AB0\u0ACD\u0AA1\u0AB0 \u0AAA\u0AC2\u0AB0\u0ACD\u0AA3 \u0A95\u0AB0\u0ACB',
    waOrderDetails: '\u0A93\u0AB0\u0ACD\u0AA1\u0AB0 \u0AB5\u0ABF\u0A97\u0AA4',
    waCustomer: '\u0A97\u0ACD\u0AB0\u0ABE\u0AB9\u0A95',
  } as const;

  const uiIcons = {
    package: '\u{1F4E6}',
    customer: '\u{1F464}',
    date: '\u{1F4C5}',
    event: '\u{1F389}',
    morning: '\u{1F305}',
    afternoon: '\u2600\uFE0F',
    evening: '\u{1F319}',
    notes: '\u{1F4DD}',
    check: '\u2705',
  } as const;

  const waDivider = '--------------------';

  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (window.confirm(`${uiText.confirmDelete} '${itemName}' ${uiText.confirmDeleteSuffix}`)) {
      await db.orderItems.delete(itemId);
    }
  };

  const handleComplete = async () => {
    await db.orders.update(orderId, { status: 'completed' });
    navigate('/');
  };

  const generateHTML = () => {
    if (!order || !items || !profile) return '';

    const pdfColor = profile.pdfColor || '#8B0000';
    const pdfColorDark = adjustColorBrightness(pdfColor, -0.3);

    const labels = {
      shreeGanesh: '\u0964\u0964 \u0AB6\u0ACD\u0AB0\u0AC0 \u0A97\u0AA3\u0AC7\u0AB6\u0ABE\u0AAF \u0AA8\u0AAE\u0A83 \u0964\u0964',
      mo: '\u0AAE\u0ACB.',
      secondNumber: '\u0AAC\u0AC0\u0A9C\u0ACB \u0AA8\u0A82\u0AAC\u0AB0',
      defaultAddress: '\u0AAE\u0AC7\u0AB8\u0AB5\u0ABE\u0AA3\u0AB5\u0ABE\u0AB3\u0ABE',
      customerName: '\u0A97\u0ACD\u0AB0\u0ABE\u0AB9\u0A95\u0AA8\u0AC1\u0A82 \u0AA8\u0ABE\u0AAE',
      date: '\u0AA4\u0ABE\u0AB0\u0AC0\u0A96',
      eventType: '\u0AAA\u0ACD\u0AB0\u0AB8\u0A82\u0A97 \u0AAA\u0ACD\u0AB0\u0A95\u0ABE\u0AB0',
      orderNumber: '\u0A93\u0AB0\u0ACD\u0AA1\u0AB0 \u0AA8\u0A82\u0AAC\u0AB0',
      address: '\u0AB8\u0AB0\u0AA8\u0ABE\u0AAE\u0AC1\u0A82',
      phone: '\u0AAB\u0ACB\u0AA8 \u0AA8\u0A82\u0AAC\u0AB0',
      morning: '\u0AB8\u0AB5\u0ABE\u0AB0\u0AC7',
      afternoon: '\u0AAC\u0AAA\u0ACB\u0AB0\u0AC7',
      evening: '\u0AB8\u0ABE\u0A82\u0A9C\u0AC7',
      details: '\u0AB5\u0ABF\u0A97\u0AA4',
      kiloShort: '\u0A95\u0ABF.',
      gramShort: '\u0A97\u0ACD\u0AB0\u0ABE.',
      notes: '\u0AA8\u0ACB\u0A82\u0AA7',
    } as const;

    const escapeHTML = (value?: string | null) =>
      (value ?? '-')
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const allItems = items?.filter(i => i.kg > 0 || i.gram > 0) || [];
    const TOP_NOTE_SPACE_HEIGHT = 90;
    const MIN_DATA_ROWS = 12;
    const dataRowsNeeded = Math.ceil(allItems.length / 3);
    const totalDataRows = Math.max(dataRowsNeeded, MIN_DATA_ROWS);

    const renderBodyRows = () =>
      Array.from({length: totalDataRows}, (_, rowIndex) => {
        const col1Index = rowIndex * 3;
        const col2Index = col1Index + 1;
        const col3Index = col1Index + 2;

        const cell = (item: (typeof allItems)[number] | undefined, groupIndex: 0 | 1 | 2) => {
          const gramClass = groupIndex < 2 ? 'c-gr sep-right' : 'c-gr';

          if (!item) {
            return `<td class="c-nm"></td><td class="c-ki"></td><td class="${gramClass}"></td>`;
          }

          const kg = item.kg > 0 ? item.kg : '';
          const gram = item.gram > 0 ? item.gram : '';
          return `
            <td class="c-nm">${escapeHTML(item.itemNameGu)}</td>
            <td class="c-ki">${kg}</td>
            <td class="${gramClass}">${gram}</td>
          `;
        };

        const rowClass = rowIndex % 2 === 0 ? '' : ' alt';
        return `<tr class="${rowClass}">${cell(allItems[col1Index], 0)}${cell(allItems[col2Index], 1)}${cell(allItems[col3Index], 2)}</tr>`;
      }).join('');

    return `
      <div class="pw">
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .pw {
            font-family: Arial, 'Noto Sans Gujarati', sans-serif;
            color: #111;
            background: #fff;
            font-size: 9.6px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            line-height: 1.5;
          }
          .pg {
            width: 190mm;
            margin: 0 auto;
            padding: 5mm 5mm;
          }

          .hd {
            border: 2px solid ${pdfColor};
            border-radius: 5px;
            padding: 6px 10px 7px;
            margin-bottom: 5px;
            position: relative;
          }
          .hd-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
          }
          .hd-ganesh {
            font-size: 8px;
            color: ${pdfColor};
            font-weight: 700;
            letter-spacing: 0.5px;
            line-height: 1.4;
          }
          .hd-contact {
            font-size: 8.2px;
            text-align: right;
            color: #222;
            line-height: 1.5;
          }
          .hd-contact strong { color: ${pdfColor}; }
          .hd-brand { text-align: center; }
          .hd-name {
            font-size: 21px;
            font-weight: 900;
            color: ${pdfColor};
            line-height: 1.3;
            letter-spacing: -0.2px;
          }
          .hd-tag {
            font-size: 8.2px;
            color: #555;
            margin-top: 3px;
            line-height: 1.4;
          }

          .ci {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid ${pdfColor};
            border-radius: 4px;
            margin-bottom: 5px;
            overflow: hidden;
          }
          .ci td {
            padding: 5px 8px;
            border: 0.8px solid #d4a0a0;
            vertical-align: middle;
            min-height: 24px;
          }
          .ci-lbl {
            display: block;
            font-size: 7px;
            color: ${pdfColor};
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          .ci-val {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #111;
            line-height: 1.4;
          }

          .mt {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid ${pdfColor};
            border-radius: 3px;
            overflow: hidden;
          }

          .mt .top-space th {
            height: ${TOP_NOTE_SPACE_HEIGHT}px;
            background: #fff;
            padding: 0;
            border-bottom: none;
          }
          .mt .top-space th:not(:last-child) {
            border-right: 1.5px solid ${pdfColor};
          }

          .mt .sh th {
            background: ${pdfColor};
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            text-align: center;
            padding: 5px 3px;
            letter-spacing: 0.5px;
            line-height: 1.3;
            min-height: 22px;
          }
          .mt .sh th:nth-child(1),
          .mt .sh th:nth-child(2) {
            border-right: 1.5px solid ${pdfColorDark};
          }

          .mt .sbh th {
            background: #fdf0f0;
            color: ${pdfColor};
            font-size: 8px;
            font-weight: 700;
            text-align: center;
            padding: 4px 2px;
            border-bottom: 1.5px solid ${pdfColor};
            line-height: 1.35;
            letter-spacing: 0.15px;
            min-height: 20px;
          }
          .mt .sbh th:nth-child(3),
          .mt .sbh th:nth-child(6) {
            border-right: 1.5px solid ${pdfColor};
          }
          .mt tbody tr td {
            padding: 4.5px 5px;
            font-size: 9px;
            border-bottom: 0.5px solid #f1dede;
            vertical-align: middle;
            line-height: 1.45;
            min-height: 20px;
          }
          .mt tbody tr.alt td { background: #fffafa; }
          .mt tbody tr:last-child td { border-bottom: none; }

          .c-nm {
            min-width: 40px;
            font-weight: 600;
            color: #111;
            border-right: 0.5px solid #e5b5b5 !important;
            line-height: 1.45;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .c-ki {
            width: 22px;
            text-align: center;
            font-size: 8.2px;
            font-weight: 700;
            color: ${pdfColor};
            border-right: 0.5px solid #e5b5b5 !important;
            line-height: 1.4;
            white-space: nowrap;
          }
          .c-gr {
            width: 26px;
            text-align: center;
            font-size: 8.2px;
            font-weight: 700;
            color: #555;
            border-right: none !important;
            line-height: 1.4;
            white-space: nowrap;
          }
          .c-gr.sep-right {
            border-right: 1.5px solid ${pdfColor} !important;
          }

          .nb {
            margin-top: 5px;
            border: 1.5px solid ${pdfColor};
            border-radius: 3px;
            padding: 6px 8px;
            font-size: 9px;
            background: #fffafa;
            line-height: 1.5;
          }
          .nb strong { color: ${pdfColor}; font-size: 8px; text-transform: uppercase; }

          .ft {
            margin-top: 7px;
            text-align: center;
            font-size: 7px;
            color: #aaa;
            line-height: 1.5;
          }
        </style>

        <div class="pg">
          <div class="hd">
            <div class="hd-top">
              <div class="hd-ganesh">${labels.shreeGanesh}</div>
              <div class="hd-contact">
                <strong>${escapeHTML(profile.ownerName)}</strong> - ${labels.mo} ${escapeHTML(profile.phone1)}
                ${profile.phone2 ? `<br>${labels.secondNumber}: ${labels.mo} ${escapeHTML(profile.phone2)}` : ''}
                <br>(${escapeHTML(profile.address || labels.defaultAddress)})
              </div>
            </div>
            <div class="hd-brand">
              <div class="hd-name">${escapeHTML(profile.name)}</div>
              ${profile.tagline ? `<div class="hd-tag">${escapeHTML(profile.tagline)}</div>` : ''}
            </div>
          </div>

          <table class="ci">
            <tr>
              <td style="width:36%">
                <span class="ci-lbl">${labels.customerName}</span>
                <span class="ci-val">${escapeHTML(order.customerName)}</span>
              </td>
              <td style="width:18%">
                <span class="ci-lbl">${labels.date}</span>
                <span class="ci-val">${dayjs(order.eventDate).format('DD/MM/YYYY')}</span>
              </td>
              <td style="width:28%">
                <span class="ci-lbl">${labels.eventType}</span>
                <span class="ci-val">${escapeHTML(order.eventType)}</span>
              </td>
              <td style="width:18%">
                <span class="ci-lbl">${labels.orderNumber}</span>
                <span class="ci-val">${escapeHTML(order.orderNumber)}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span class="ci-lbl">${labels.address}</span>
                <span class="ci-val">${escapeHTML(order.customerAddress)}</span>
              </td>
              <td colspan="2">
                <span class="ci-lbl">${labels.phone}</span>
                <span class="ci-val">${escapeHTML(order.customerPhone)}</span>
              </td>
            </tr>
          </table>

          <table class="mt">
            <thead>
              <tr class="top-space">
                <th colspan="3"></th>
                <th colspan="3"></th>
                <th colspan="3"></th>
              </tr>
              <tr class="sh">
                <th colspan="3">&nbsp;</th>
                <th colspan="3">&nbsp;</th>
                <th colspan="3">&nbsp;</th>
              </tr>
              <tr class="sbh">
                <th>${labels.details}</th>
                <th style="width:22px">${labels.kiloShort}</th>
                <th style="width:26px">${labels.gramShort}</th>
                <th>${labels.details}</th>
                <th style="width:22px">${labels.kiloShort}</th>
                <th style="width:26px">${labels.gramShort}</th>
                <th>${labels.details}</th>
                <th style="width:22px">${labels.kiloShort}</th>
                <th style="width:26px">${labels.gramShort}</th>
              </tr>
            </thead>
            <tbody>
              ${renderBodyRows()}
            </tbody>
          </table>

          ${order.notes ? `
            <div class="nb">
              <strong>${labels.notes} :</strong> ${escapeHTML(order.notes)}
            </div>
          ` : ''}

          <div class="ft">
            Generated via CaterBill &nbsp;&middot;&nbsp; Made with &#10084; by Prince Chaniyara
          </div>
        </div>
      </div>
    `;
  };
  const exportPDF = async () => {
    setIsExporting(true);
    const element = document.createElement('div');
    try {
      const html = generateHTML();
      element.innerHTML = html;
      document.body.appendChild(element);

      const opt = {
        margin:       [3, 3, 3, 3] as [number, number, number, number],
        filename:     `${order?.customerName}_Bill.pdf`,
        image:        { type: 'jpeg' as const, quality: 1 },
        html2canvas:  { 
          scale: 2.5, 
          useCORS: true, 
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: false },
        pagebreak:    { mode: ['css', 'legacy'] as ['css', 'legacy'], avoid: 'tr' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Error:', error);
      alert('PDF Error');
    } finally {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
      setIsExporting(false);
    }
  };

  const shareWhatsApp = async () => {
    if (!order || !items) return;

    const filteredItems = items.filter(i => i.kg > 0 || i.gram > 0);
    const formatItems = (itemList: typeof items) => 
      itemList
        .map(
          (i) =>
            `${uiIcons.check} *${i.itemNameGu}*: ${
              i.kg ? `${i.kg} ${uiText.kilo}` : ''
            } ${i.gram ? `${i.gram} ${uiText.gram}` : ''}`.trim(),
        )
        .join('\n');

    const text = `*${uiIcons.package} ${uiText.waOrderDetails} - ${profile?.name}*\n` +
      `${waDivider}\n` +
      `${uiIcons.customer} *${uiText.waCustomer}:* ${order.customerName}\n` +
      `${uiIcons.date} *${uiText.date}:* ${dayjs(order.eventDate).format('DD/MM/YYYY')}\n` +
      `${uiIcons.event} *${uiText.eventType}:* ${order.eventType}\n` +
      `${waDivider}\n\n` +
      `*${uiText.items}*\n${formatItems(filteredItems)}\n\n` +
      (order.notes ? `*${uiIcons.notes} ${uiText.notes}:*\n${order.notes}\n\n` : '') +
      `_Generated via CaterBill_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!order || !items) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-red-100 border-t-[#C0392B] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col bg-[#F8F9FA] min-h-full">
      <div className="p-4 space-y-6 pb-60">
        
        {/* Customer Header Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => navigate(`/order/${orderId}/edit`)}
              className="p-3 bg-gray-50 text-gray-400 hover:text-[#C0392B] rounded-2xl active:scale-90 transition-all"
            >
              <Edit3 size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <User size={28} className="text-[#C0392B]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{order.customerName}</h2>
              <p className="text-xs font-black text-[#C0392B] uppercase tracking-widest">{order.orderNumber}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={10} /> {uiText.date}
              </span>
              <p className="font-bold text-gray-800">{dayjs(order.eventDate).format('DD MMM, YYYY')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle size={10} /> {uiText.eventType}
              </span>
              <p className="font-bold text-gray-800">{order.eventType}</p>
            </div>
            {order.customerPhone && (
              <div className="col-span-2 pt-2 border-t border-gray-50 flex items-center gap-3">
                <Phone size={14} className="text-gray-300" />
                <p className="font-bold text-gray-600">{order.customerPhone}</p>
              </div>
            )}
            {order.customerAddress && (
              <div className="col-span-2 pt-2 flex items-center gap-3">
                <MapPin size={14} className="text-gray-300" />
                <p className="font-medium text-gray-500 text-sm leading-snug">{order.customerAddress}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Items List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 bg-red-50/30 flex items-center gap-3">
            <span className="text-xl">📦</span>
            <span className="font-black uppercase tracking-widest text-sm text-[#C0392B]">{uiText.items}</span>
            <span className="text-[10px] font-black bg-white px-2 py-1 rounded-full shadow-sm text-gray-400">
              {items.filter(i => i.kg > 0 || i.gram > 0).length} આઇટમ્સ
            </span>
          </div>
          
          <div className="divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">{uiText.noItems}</p>
              </div>
            ) : (
              items.map(item => (
                (item.kg > 0 || item.gram > 0) && (
                  <div key={item.id} className="p-4 px-5 flex justify-between items-center group active:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg leading-tight">{item.itemNameGu}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-[#C0392B] bg-red-50 px-2 py-0.5 rounded-lg">
                          {item.kg > 0 && `${item.kg} ${uiText.kilo} `}
                          {item.gram > 0 && `${item.gram} ${uiText.gram}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/order/${orderId}/items`)}
                        className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id!, item.itemNameGu)}
                        className="p-2.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              ))
            )}
          </div>
        </motion.div>

        {/* Notes */}
        {order.notes && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50/30 p-6 rounded-[28px] border border-dashed border-red-100"
          >
            <h3 className="text-xs font-black text-[#C0392B] uppercase tracking-widest mb-2">{uiIcons.notes} {uiText.notes}</h3>
            <p className="text-gray-700 font-medium leading-relaxed">{order.notes}</p>
          </motion.div>
        )}
      </div>

      {/* Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 pb-10 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] space-y-3">
        <div className="flex gap-3">
          <button 
            onClick={exportPDF}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-700 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50 h-14"
          >
            {isExporting ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <FileDown size={20} />}
            PDF
          </button>
          <button 
            onClick={shareWhatsApp}
            className="flex-[1.5] flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-black text-sm shadow-lg shadow-green-900/10 active:scale-95 transition-all h-14"
          >
            <Share2 size={20} /> WhatsApp
          </button>
          <button 
            onClick={() => navigate(`/order/${orderId}/items`)}
            className="p-4 bg-gray-100 text-gray-500 rounded-2xl active:scale-95 transition-all h-14 w-14 flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </div>
        
        <button 
          onClick={handleComplete}
          className="w-full flex items-center justify-center gap-3 bg-[#C0392B] text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all h-16"
        >
          <CheckCircle size={24} /> 
          {order.status === 'completed' ? uiText.backHome : uiText.completeOrder}
        </button>
      </div>
    </div>
  );
}
