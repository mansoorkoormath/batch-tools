var metadataSchemas;

/*
 * http://stackoverflow.com/questions/5448545/how-to-retrieve-get-parameters-from-javascript
 * getSearchParameters() and transformToAssocArray()
 */
function getSearchParameters() {
    var prmstr = window.location.search.substr(1);
    return transformToAssocArray(prmstr);
}

function transformToAssocArray( prmstr ) {
  if (prmstr == null) prmstr = "";
  var params = {
	"query_field[]" : [],
	"query_op[]"    : [],
	"query_val[]"   : [],
	"show_fields[]"   : [],
	"limit"         : 100,
	"offset"        : 0,		  
  };
  $("#this-search").attr("href",window.location.href);
  var prmarr = prmstr.split("&");
  for ( var i = 0; i < prmarr.length; i++) {
      var tmparr = prmarr[i].split("=");
      var field = tmparr[0];
      var val = tmparr[1];
      var pval = params[field];
      
      if ($.isArray(pval)) {
    	  pval[pval.length] = val;    	  
      } else {
    	  params[field] = val;
      }
  }
  return params;
}

$(document).ready(function(){
	createFilterTable();
	var params = getSearchParameters();
	loadMetadataFields(params);
});

function loadMetadataFields(params) {
	$.getJSON(
		"/rest/metadataregistry",
		function(data){
			metadataSchemas = data;
			$("#limit").val(params.limit);  
		    $("#offset").val(params.offset);
		    var fields = params["query_field[]"];
		    var ops = params["query_op[]"];
		    var vals = params["query_val[]"];
		    if (fields.length == 0) {
				drawFilterQuery("","","");
		    } else {
		    	for(var i=0; i<fields.length; i++) {
		    		var op = ops.length > i ? ops[i] : "";
		    		var val = vals.length > i ? vals[i] : "";
					drawFilterQuery(fields[i],op,val);
		    	} 
		    }
			drawShowFields(params["show_fields[]"]);
		}
	);
}

function drawShowFields(pfields) {
	var sel = $("<select name='show_fields'/>").attr("multiple","true").attr("size","8").appendTo("#show-fields");
	$.each(metadataSchemas, function(index, schema){
		$.each(schema.fields, function(findex, field) {
			var name = field.name;
			var opt = $("<option/>");
			opt.attr("value",name).text(name);
			for(var i=0; i<pfields.length; i++) {
				if (pfields[i] == name) {
					opt.attr("selected", true);
				}
			}
			sel.append(opt);
		});
	});
}

function drawFilterQuery(pField, pOp, pVal) {
	var div = $("<div class='metadata'/>").appendTo("#queries");
	var sel = $("<select class='query-tool' name='query_field[]'/>");
	var opt = $("<option/>");
	sel.append(opt);
	$.each(metadataSchemas, function(index, schema){
		$.each(schema.fields, function(findex, field) {
			var name = field.name;
			var opt = $("<option/>");
			opt.attr("value",name).text(name);
			sel.append(opt);
		});
	});
	sel.val(pField);
	div.append(sel);
	sel = $("<select class='query-tool' name='query_op[]'/>");
	$("<option>exists</option>").val("exists").appendTo(sel);
	$("<option>does not exist</option>").val("not_exists").appendTo(sel);
	$("<option selected>equals</option>").val("equals").appendTo(sel);
	$("<option>does not equals</option>").val("not_equals").appendTo(sel);
	$("<option>like</option>").val("like").appendTo(sel);
	$("<option>not like</option>").val("not_like").appendTo(sel);
	$("<option>contains</option>").val("contains").appendTo(sel);
	$("<option>does not contain</option>").val("doesnt_contain").appendTo(sel);
	$("<option>matches</option>").val("matches").appendTo(sel);
	$("<option>does not match</option>").val("doesnt_match").appendTo(sel);
	sel.change(function(){
		var val = $(this).val();
		var disableval = (val == "exists" || val == "not_exists");
		$(this).parent("div.metadata").find("input[name='query_val[]']").val("").attr("readonly",disableval);
	});
	div.append(sel);
	sel.val(pOp);
	var input = $("<input class='query-tool' name='query_val[]'/>");
	div.append(input);
	input.val(pVal);
	$("<button class='field_plus'>+</button>").appendTo(div).click(function(){
		drawFilterQuery();
		queryButtons();
	});
	$("<button class='field_minus'>-</button>").appendTo(div).click(function(){
		$(this).parent("div.metadata").remove();
		queryButtons();
	});
	$("#query-button").click(function(){runQuery();})
}

function queryButtons() {
	$("button.field_plus").attr("disabled",true);
	$("button.field_plus:last").attr("disabled",false);
	$("button.field_minus").attr("disabled",false);
	$("div.metadata:first button.field_minus").attr("disabled",true);		
}

function runQuery() {
	var params = {
		"query_field[]" : [],
		"query_op[]"    : [],
		"query_val[]"   : [],
		"show_fields"   : $("#show-fields select").val(),
		"limit"         : $("#limit").val(),
		"offset"        : $("#offset").val(),
		"expand"        : "parentCollection,metadata"
	};
	$("select.query-tool,input.query-tool").each(function() {
		var paramArr = params[$(this).attr("name")];
		paramArr[paramArr.length] = $(this).val();
	});
	params.limit = $("#limit").val();
	params.offset = $("#offset").val();
	$.getJSON("/rest/filtered-items", params, function(data){
		drawItemFilterTable(data);
	});
	$("#this-search").attr("href", window.location.pathname + $.param(params));
}

var mdCols = [];

function drawItemFilterTable(data) {
	var itbl = $("#itemtable");
	itbl.find("tr").remove("*");
	var tr = addTr(itbl).addClass("header");
	addTh(tr, "Num").addClass("num").addClass("sorttable_numeric");
	addTh(tr, "Collection");
	addTh(tr, "Item Handle");
	addTh(tr, "Title");
	
	mdCols = [];
	$.each(data.metadata, function(index, field) {
		addTh(tr,field.key).addClass("returnFields");
		mdCols[mdCols.length] = field.key;
	});

	$.each(data.items, function(index, item){
		var tr = addTr(itbl);
		tr.addClass(index % 2 == 0 ? "odd data" : "even data");
		addTd(tr, index+1).addClass("num");
		addTdAnchor(tr, item.parentCollection.name, "/handle/" + item.parentCollection.handle).addClass("ititle");
		addTdAnchor(tr, item.handle, "/handle/" + item.handle);
		addTd(tr, item.name).addClass("ititle");
		
		for(var i=0; i<mdCols.length; i++) {
			var key =  mdCols[i];
			var td = addTd(tr, "");
			$.each(item.metadata, function(index, metadata) {
				if (metadata.key == key) {
					if (metadata.value != null) {
						var div = $("<div>"+metadata.value+"</div>");
						td.append(div);
					}
				}
			});
		}
		
	});

	$("#itemdiv").dialog({title: data["query-annotation"], width: "80%", minHeight: 500, modal: true});
}
