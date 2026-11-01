(function(){
  /* كل تصدير الجداول بيطلع ملف Excel (.xlsx) مرتب وسهل القراءة والتعديل */
  var origExportCsv=window.exportCsv;

  window.exportCsv=function(filename,rows){
    if(typeof XLSX==='undefined'||!Array.isArray(rows)||!rows.length){
      return origExportCsv?origExportCsv.apply(this,arguments):undefined;
    }
    var outName=String(filename||'RMY_Export').replace(/\.csv$/i,'')+'.xlsx';
    var data=rows.map(function(r){
      return (Array.isArray(r)?r:[r]).map(function(v){ return v==null?'':v; });
    });
    var ws=XLSX.utils.aoa_to_sheet(data);
    var ref=ws['!ref']||'A1:A1';
    var range=XLSX.utils.decode_range(ref);

    // عرض الأعمدة حسب أطول قيمة فيها
    var cols=[];
    for(var c=range.s.c;c<=range.e.c;c++){
      var w=8;
      for(var r=range.s.r;r<=range.e.r;r++){
        var cell=ws[XLSX.utils.encode_cell({r:r,c:c})];
        if(cell&&cell.v!=null){ var len=String(cell.v).length; if(len>w)w=len; }
      }
      cols.push({wch:Math.min(42,w+3)});
    }
    ws['!cols']=cols;

    // الصف الأول (العناوين): خلفية زرقا وكتابة بيضا وخط تقيل
    var headStyle={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'1D4E89'}},alignment:{horizontal:'center',vertical:'center',wrapText:true,readingOrder:2},border:{bottom:{style:'thin',color:{rgb:'9AA9B7'}}}};
    var bodyStyle={alignment:{horizontal:'right',vertical:'center',readingOrder:2},border:{bottom:{style:'hair',color:{rgb:'DBE4EC'}}}};
    for(var rr=range.s.r;rr<=range.e.r;rr++){
      for(var cc=range.s.c;cc<=range.e.c;cc++){
        var ad=XLSX.utils.encode_cell({r:rr,c:cc});
        if(!ws[ad])continue;
        ws[ad].s=(rr===range.s.r)?headStyle:bodyStyle;
      }
    }

    ws['!autofilter']={ref:ref};
    ws['!freeze']={xSplit:0,ySplit:1};

    var wb=XLSX.utils.book_new();
    wb.Workbook={Views:[{RTL:true}]};
    wb.Props={Title:outName.replace(/\.xlsx$/i,''),Author:'RMY',CreatedDate:new Date()};
    XLSX.utils.book_append_sheet(wb,ws,'بيانات');
    XLSX.writeFile(wb,outName,{cellStyles:true});
  };
})();
