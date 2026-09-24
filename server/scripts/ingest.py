"""Read-only PDF/DOCX extraction. All output is unverified staging data."""
from pathlib import Path
from collections import Counter
import argparse, hashlib, json, re
from pypdf import PdfReader
from docx import Document


def clean(text):
    text = text.replace('\x00', '').replace('\ufb01','fi').replace('\ufb02','fl')
    return '\n'.join(re.sub(r'[ \t]+',' ', line).strip() for line in text.splitlines()).strip()


def extract(path):
    if path.suffix.lower()=='.pdf':
        reader=PdfReader(path)
        pages=[{'page':i+1,'locator':f'PDF page {i+1}','text':clean(page.extract_text() or '')} for i,page in enumerate(reader.pages)]
        boundary=Counter()
        for page in pages:
            lines=page['text'].splitlines()
            boundary.update(set(lines[:2]+lines[-2:]))
        repeated={line for line,n in boundary.items() if n>=max(3,len(pages)*.4) and len(line)<100}
        for page in pages:
            lines=page['text'].splitlines()
            page['text']='\n'.join(line for i,line in enumerate(lines) if not (line in repeated and (i<2 or i>=len(lines)-2)) and not re.fullmatch(r'\d{1,4}',line))
        return pages,sorted(repeated)
    if path.suffix.lower()=='.docx':
        doc=Document(path)
        blocks=[]
        pi=ti=0
        from docx.text.paragraph import Paragraph
        from docx.table import Table
        for element in doc.element.body:
            if element.tag.endswith('}p'):
                pi+=1
                value=clean(Paragraph(element,doc).text)
                if value: blocks.append({'page':None,'locator':f'Paragraph {pi}','text':value})
            elif element.tag.endswith('}tbl'):
                ti+=1
                for ri,row in enumerate(Table(element,doc).rows,1):
                    # Merged cells repeat references; retain each physical cell once.
                    cells=[]; seen=set()
                    for cell in row.cells:
                        key=cell._tc
                        if key not in seen:
                            seen.add(key)
                            if clean(cell.text): cells.append(clean(cell.text))
                    if cells: blocks.append({'page':None,'locator':f'Table {ti}, row {ri}','text':' | '.join(cells)})
        return blocks,[]
    raise ValueError('Unsupported file type')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',default='server/data/source/inbox')
    parser.add_argument('--output',default='server/data/ingestion')
    args=parser.parse_args()
    source=Path(args.input); output=Path(args.output)
    output.mkdir(parents=True,exist_ok=True)
    source.mkdir(parents=True,exist_ok=True)
    report=[]
    for path in sorted(source.rglob('*')):
        if not path.is_file(): continue
        record={'originalFile':path.as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'verified':False,'sourceType':'unclassified'}
        try:
            if path.suffix.lower() not in ['.pdf','.docx']:
                record.update(status='not-ingested',reason='Not a PDF/DOCX; preserve for manual inspection.')
                report.append(record);continue
            pages,removed=extract(path)
            nonempty=[page for page in pages if len(page['text'])>40]
            record.update(status='extracted' if nonempty else 'skipped',reason=None if nonempty else 'No readable text; may require OCR, not attempted.',pageCount=len(pages) if path.suffix.lower()=='.pdf' else None,blockCount=len(pages),readableBlocks=len(nonempty))
            target=output/(path.stem+'.extracted.json')
            target.write_text(json.dumps({'originalFile':path.as_posix(),'sha256':record['sha256'],'removedRepeatedLines':removed,'blocks':pages},ensure_ascii=False,indent=2),encoding='utf-8')
            record['extractionFile']=target.as_posix()
            # Staging only: page/paragraph-bounded candidates never enter the live manifest.
            candidates=[]; fingerprints=set()
            for block in nonempty:
                lines=block['text'].splitlines()
                headings=[line for line in lines if 4<len(line)<110 and (line.isupper() or re.match(r'^\d+[.)]\s+\w',line))]
                paragraphs=re.split(r'\n\s*\n',block['text'])
                for para in paragraphs:
                    words=para.split()
                    for offset in range(0,len(words),300):
                        text=' '.join(words[offset:offset+300])
                        key=hashlib.sha256(text.lower().encode()).hexdigest()
                        if len(text)<80 or key in fingerprints: continue
                        fingerprints.add(key)
                        candidates.append({'id':f"candidate_{record['sha256'][:8]}_{len(candidates)+1}",'title':headings[0] if headings else 'Manual topic review required','content':text,'sourcePage':block['page'],'sourceLocator':block['locator'],'originalFile':path.as_posix(),'sourceType':'unclassified','verified':False,'reviewNote':'Automatic extraction only. Check reading order, metadata, subject, relevance and source before promoting.'})
            (output/(path.stem+'.candidates.json')).write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8')
            record['candidateCount']=len(candidates)
        except Exception as error:
            record.update(status='failed',reason=str(error))
        report.append(record)
    (output/'extraction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
