import {unique,alphabetically,Offtext,cjkPhrases,removeBracket,alphabetically0, fromObj,nodefs,parseOfftext,readTextLines, writeChanged} from 'ptk/nodebundle.cjs'
await nodefs;
import {meta_cm} from 'ptk/nodebundle.cjs'
/*
  encodeFactor 將 一個詞編碼
  encodeFactors 將 多個詞編碼，合併重覆
*/
const {SickFactors,encodeFactor,encodeFactors} = meta_cm;

const needtag={

ill:1,
norm:2,western:2,chinese:2,
symtoms:2,pulse:2,tounge:2,combo:2,ingredients:2,
formula:3, origin:3,alias:3
}

let tid='';
const rawtext=readTextLines('./zyzhx-raw.off');

const extractneedtag=()=>{
    const out=[];
    for (let i=0;i<rawtext.length;i++) {
        const line=rawtext[i];
        if (line.slice(0,3)=='^ck') {
            tid='l'+line.slice(3,12);
            out.push('^ck'+line.slice(3,12));//+diseasename(tid))
            continue;
        }
        line.replace(/\^([a-z]+)(\d*)([^\^]+)/g,(m,tag,n,content)=>{
            if (needtag[tag]) out.push('^'+tag+n+content);
        })
    }
    return out;
}
const TagStat={};
const illness={};
const addPhrases=(t, Obj , Factor)=>{
    const words=cjkPhrases(t);
    for (let i=0;i<words.length;i++) {
        const w=words[i];
        const code=encodeFactor(w, Factor).join('')||' ';
        if (!Obj[w]) Obj[w]={count:0, code};
        Obj[w].count++;
    }
}
const addIllness=(t,Obj)=>{
    if (!Obj[t]) Obj[t]=0;
    Obj[t]++;
}
const parseField=lines=>{
    for (let i=0;i<lines.length;i++) {
        const line=lines[i];
        const ot=new Offtext(line);
        for (let j=0;j<ot.tags.length;j++) {
            const tag=ot.tags[j];
            const tagtype=needtag[tag.name];
            if (tagtype==1) {
                const t=removeBracket(ot.tagText(j).trim());
                if (!t) console.log('error empty illness',i+1,line)
                addIllness(t, illness);
            } else if (tagtype==2) {
                if (!TagStat[tag.name]) TagStat[tag.name]={};
                addPhrases(ot.plain.slice(tag.offset).trim(),TagStat[tag.name], SickFactors[tag.name]);
            } else if (tagtype==3) {
                const t=removeBracket(ot.tagText(j).trim());
                if (!TagStat[tag.name]) TagStat[tag.name]={};
                addIllness(t, TagStat[tag.name]);
            }
        }
    }
}

const rawfields=extractneedtag();
rawfields.unshift('^ak1【證候】^bk1【證候】');
writeChanged('off/zyzhx.off',rawfields.join('\n'),true);

parseField(rawfields);

writeChanged('zyzhx-illness.txt',fromObj(illness,true).join('\n'),true);
for (let key in TagStat) {
    const arr=fromObj(TagStat[key],(a,b)=>[a,b.count,b.code]).filter(it=>!!it[2]);
    arr.sort((a,b)=>b[1]-a[1]);
    writeChanged('zyzhx-'+key+'.txt', arr.join('\n'),true);
}
export const encodeLines=rawfields=>{
    let codes='',illline=0;
    const out=[];
    //keyed by illness linenumber
    //multiple symtoms/tounge/pulse in same ill are combined
    let toungecodes='',symtomcodes='',pulsecodes='';
    for (let i=0;i<rawfields.length;i++) {
        const line=rawfields[i];
        const tag=line.slice(1,6);
        
        if (tag.slice(0,3)=='ill') {
            if (symtomcodes+pulsecodes+toungecodes) {
                out.push( illline+'\t'+symtomcodes+'\t'+toungecodes+'\t'+pulsecodes);
            }
            illline=i;
            symtomcodes='',pulsecodes='',toungecodes='';
        } else if (tag=='symto') {
            const words=cjkPhrases(line.slice(8));
            symtomcodes+=encodeFactors(words, 'symtoms').join('');
        } else if (tag=='toung') {
            const words=cjkPhrases(line.slice(8));
            toungecodes+=encodeFactors(words, 'tounge').join('');
        } else if (tag=='pulse') {
            const words=cjkPhrases(line.slice(6));
            pulsecodes+=encodeFactors(words, 'pulse').join('');
        }
    }
    out.unshift('^:<name=manifest caption=症象 keytype=serial preload=true>ill:unique_number\tsymtom\ttounge\tpulse');
    writeChanged('off/3manifest.tsv',out.join('\n'),true);
}
encodeLines(rawfields);

