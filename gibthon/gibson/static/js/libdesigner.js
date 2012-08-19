/*
* libDesigner api
*
*   depends on ajax.js & libfrag.js
*
*/

var libDesigner = new function()
{
    this.getConstructByID = function(cid, _suc)
    {
        AJAX.post({
            url: '/gibthon/api/' + cid + '/getInfo/', 
            success: function(data)
            {
                _suc(new Construct(data));
            }
        });
    }
    this.getTestConstruct = function()
    {
        var test_data = {
            id: 1,
            name: 'Test Construct',
            desc: 'This construct is a test',
            length: 10079,
            modified: 'blah',
            fs: [
                {
                    "origin": "BioBrick", 
                    "name": "pSB1C3", 
                    "refs": [], 
                    "annots": {}, 
                    "length": 2070, 
                    "id": 1, 
                    "desc": "High copy BioBrick assembly plasmid"
                },
                {
                    "origin": "BioBrick", 
                    "name": "BBa_K325219", 
                    "refs": [], 
                    "annots": {}, 
                    "length": 3841, 
                    "id": 2, 
                    "desc": "Red Firefly Luciferase and LRE"+
                        "(under pBAD)L. Cruciata(E. coli optimised)"
                },
                {
                    "origin": "Nucleotide Database", 
                    "name": "HD065425", 
                    "refs": [], 
                    "annots": {}, 
                    "length": 4168, 
                    "id": 5, 
                    "desc": "Sequence 52 from Patent WO2010070295."
                },
            ],
            cfs: [
                {
                    id: 1,
                    direction: 1,
                    s_offset: 0,
	                s_feat: -1,
                    e_offset: 0,
                    e_feat: -1,
                    order: 0,
                },
                {
                    id: 2,
                    direction: -1,
                    s_offset: 0,
	                s_feat: -1,
                    e_offset: 0,
                    e_feat: -1,
                    order: 1,
                },
                {
                    id: 3,
                    direction: 1,
                    s_offset: 0,
	                s_feat: -1,
                    e_offset: 0,
                    e_feat: -1,
                    order: 2,
                },
            ],
        };
        
        return new Construct(test_data);
    };

};

function Construct(data)
{
    this.id = data.id;
    this.name = data.name;
    this.desc = data.desc;
    this.length = data.length;
    this.cfs = new Array();
    this.fs = new Array();
    this.modified = data.created;

    for(var i = 0; i < data.cfs.length; i=i+1)
    {
        var f = new Fragment(data.fs[i]);
        this.fs.push(f);
        this.cfs.push(new ConstructFragment(data.cfs[i], f));
    }

   this.addFragment = function(f, position, direction, _suc)
    {
        console.log('AddingFragment at ' + position);
        AJAX.post({
            url: '/gibthon/api/' + this.id + '/addFragment/', 
            data: {'fid': f.getID(), 'pos': position, 'dir':direction,}, 
            success: function(cf) {
                if($.isFunction(_suc)) _suc(new ConstructFragment(cf, f));
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                console.log('Could not addFragment: ' + textStatus);
            },
        });
    }

    this.rmFragment = function(cfid, _suc)
    {
        AJAX.post({
            url: '/gibthon/api/' + this.id + '/rmFragment/', 
            data: {'cfid': cfid,}, 
            success: function() {if(_suc!=undefined) _suc();},
        });
    }

    this.reorder = function(cfids, dirs, _suc)
    {
        AJAX.post({
            url: '/gibthon/api/' + this.id + '/saveOrder/', 
            data: {'cfid[]':cfids, 'direction[]':dirs,},
            success: function() {if(_suc!=undefined) _suc();},
        });
    }

    this.saveMeta = function(name, desc)
    {
        if(name)//can't have an empty string for name
            this.name = name;
        if(desc!=undefined)
            this.desc = desc;
        AJAX.post({
            url: '/gibthon/api/' + this.id + '/saveMeta/', 
            data: {'name': this.name, 'desc': this.desc,}, 
        });
    }



}

function ConstructFragment(d, f)
{		
	this.id = d.id;
	this.strand = d.direction;
	this.s_offset = d.s_offset;
	this.s_feat = d.s_feat;
	this.e_offset = d.e_offset;
	this.e_feat = d.e_feat;
	this.order = d.order;
	this.f = f;
	
	this.startPos = function()
	{
		/*if(this.id == undefined) return 0;
		//console.log('startPos: s_feat: '+this.s_feat+' s_offset: '+this.s_offset);
		if(this.s_feat > 0)
		{
			//var sf = f.getFeatById(this.s_feat);
			if(sf != null)
				return this.s_offset + sf.start;
		}*/
		return this.s_offset;
	};
	this.endPos = function()
	{
		/*if(this.id == undefined) return this.f.getLength();
		if(this.e_feat > 0)
		{
			var ef = this.f.getFeatById(this.e_feat);
			if(ef != null)
				return this.e_offset + ef.end;
		}*/
		return this.f.getLength() - this.s_offset;
	};
	this.getLength = function()
	{
		return Math.abs(this.endPos() - this.startPos());
	};
    this.length = function()
    {
        console.warn('ConstructFragment.length depreciated');
        return this.getLength();
    }
	this.toString = function() {return '[ConstructFragment (id='+this.id+') ]';};
 };

 /*
  * jQuery widget for previewing the designed fragment
  */
 $.widget('ui.constructPreview', {
     options: {

     },
     _create: function() {
        var self = this;
        var el = $(this.element[0]);
        this.el = el;

        var css = $("<link>");
        css.attr({
            rel:  "stylesheet",
            type: "text/css",
            href: "/static/css/construct_preview.css"
        });
        $("head").append(css);


        el.find('.fragment > .pcr-target').mouseenter(function() {
            $(this).siblings('.fwd-primer').addClass('sl');
            $(this).siblings('.rev-primer').addClass('sl');
            $(this).parent().addClass('sl');
        }).mouseleave(function() {
            $(this).siblings('.fwd-primer').removeClass('sl');
            $(this).siblings('.rev-primer').removeClass('sl');
            $(this).parent().removeClass('sl');
        });

        el.find('.fragment > .join-target').mouseenter(function(){
            var f = $(this).parent();
            self._get_prev(f).find('.rev-primer').addClass('sl');
            f.find('.fwd-primer').addClass('sl');
            $(this).siblings('.join-target-hl').addClass('sl');
        }).mouseleave(function()
        {
            var f = $(this).parent();
            self._get_prev(f).find('.rev-primer').removeClass('sl');
            f.find('.fwd-primer').removeClass('sl');
            $(this).siblings('.join-target-hl').removeClass('sl');
        });

        el.find('.fragment > .post-join-target').mouseenter(function()
        {
            $(this).siblings('.post-join-target-hl').addClass('sl');
            var f = $(this).parent();
            f.find('.rev-primer').addClass('sl');
            self._get_next(f).find('.fwd-primer').addClass('sl');
        }).mouseleave(function()
        {
            $(this).siblings('.post-join-target-hl').removeClass('sl');
            var f = $(this).parent();
            f.find('.rev-primer').removeClass('sl');
            self._get_next(f).find('.fwd-primer').removeClass('sl');
        });

        el.mouseleave( function() {
            el.find('.fwd-primer').removeClass('sl');
            el.find('.rev-primer').removeClass('sl');
            el.find('.fragment').removeClass('sl');
        });
     },
     _init: function() {
        this.el.find('.fragment:not(.bk-fragment)').each( function() {
            $(this).find('.seq').css({
                'background-color': libFrag.getNextColor(),
            });
        });
     },
    _get_next: function(f)
    {
        var n = f.next('.fragment');
        if(n.size() == 0)
        {
            n = f.siblings('.fragment:not(.bk-fragment)').first();
        }
        return n;
    },
    _get_prev: function(f)
    {
        var n = f.prev('.fragment');
        if(n.hasClass('bk-fragment'))
        {
            n = f.siblings('.fragment:not(.bk-fragment)').last();
        }
        return n;
    },
 });
