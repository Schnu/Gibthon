import simplejson as json
from gibthon.jsonresponses import JsonResponse, ERROR

from fragment.models import *
from fragment.api import get_gene
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotFound, Http404
from gibson.views import get_construct
from fragment.views import get_fragment
from fragment.api import get_gene, read_meta

from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required

def cf2dict(cf):
	"""
		Convert a ConstructFragment to a dictionary suitable for JSON encoding
	"""
	ret = {	'id': cf.id,
			'fid': cf.fragment.id,
			'order': cf.order,
			'direction': 1,
			's_feat': -1,
			's_offset': cf.start_offset,
			'e_feat': -1,
			'e_offset': cf.end_offset,
		}
	if cf.direction == 'r':
		ret['direction'] = -1

	if cf.start_feature:
		ret['s_feat'] = cf.start_feature.id
	if cf.end_feature:
		ret['e_feat'] = cf.end_feature.id
	
	return ret
			

@login_required
def save_meta(request, cid):
	"""	Save a construct's metadata
		Post Data, all optional
		name, desc
	"""
	if request.method == 'POST':
		con = get_construct(request.user, cid)
		if not con:
			return JsonResponse({'errors': {'all': "Construct with id '%s' not found" % cid,}}, ERROR)
		name = request.POST.get('name', con.name)
		desc = request.POST.get('desc', con.description)
		if (name != con.name) or (desc != con.description):
			con.name = name
			con.description = desc
			try:
				con.save()
			except Exception as e:
				return JsonResponse('One or more fields are too long.', ERROR)
				
		return JsonResponse({'modified': con.last_modified(), 'fields': {'name': con.name, 'desc': con.desc}});
		
	raise Http404
	
@login_required
def update_settings(request, cid):
	if request.method == 'POST':
		con = get_construct(request.user, cid)
		if not con:
			return JsonResponse({'errors': {'all':"Construct with id '%s' not found",},} % cid, ERROR)
		form = SettingsForm(request.POST, instance=con.settings)
		if form.is_valid():
			form.save()
			data = {}
			for key,value in form.cleaned_data.items():
				data[key] = str(value);
			return JsonResponse({'modified': con.last_modified(), 'fields': data})
		return JsonResponse({'errors': form.errors,}, ERROR)
	raise Http404

@login_required
def get_info(request, cid):
	"""Get information about a construct"""
	try:
		c = get_construct(request.user, cid)
		cfs = []
		fs = []
		for cf in c.cf.all():
			cfs.append(cf2dict(cf));
			g = get_gene(request.user, cf.fragment.id)
			fs.append(read_meta(g))
			
		ret = {
            'id': cid,
			'name': c.name,
			'desc': c.description,
			'length': c.length(),
			'cfs': cfs,
			'fs': fs,
			'created': c.last_modified(),
		}
		return JsonResponse(ret)
	except ObjectDoesNotExist:
		return JsonResponse('Construct %s not found.' % s, ERROR)
	raise Http404

@login_required
def fragment_add(request, cid):
	con = get_construct(request.user, cid)
	if con:
		post = json.loads(request.raw_post_data)
		fid = post.get('fid')
		
		if not fid:
			return JsonResponse("No fragment id provided", ERROR)
		f = get_fragment(request.user, fid)
		
		pos = post.get('pos', 0);
		strand = post.get('dir', 1);
		
		direction = 'f'
		if strand == -1:
			direction = 'r'
		
		if f:
			cf = con.add_fragment(f, pos, direction)
			if cf:
				return JsonResponse(cf2dict(cf))
			else:
				return JsonResponse('Could not add fragment %s to construct %s' % (fid, cid))
		else:
			if request.is_ajax():
				return JsonResponse('Could not find fragment "%s"' % fid, ERROR)
			return HttpResponseNotFound()
	else:
		return HttpResponseNotFound()

@login_required
def fragment_remove(request, cid):
	con = get_construct(request.user, cid)
	post = json.loads(request.raw_post_data)
	cfid = post.get('cfid')
	if not cfid:
		return JsonResponse('No ConstructFragment ID specified', ERROR)
	if con:
		try:
			con.delete_cfragment(cfid)
		except ObjectDoesNotExist as e:
			return JsonResponse('No such fragment "%s" associated with construct "%s".' % (cfid, cid))
		
		return JsonResponse('OK');
	else:
		return JsonResponse('No such Construct ' + cid, ERROR)

directions = {1:'f', -1:'r',}

@login_required
def save_order(request, cid):
	con = get_construct(request.user, cid)
	post = json.loads(request.raw_post_data)
	order = post.get('d[]')
	if not order:
		return JsonResponse('No order provided.', ERROR)
	if len(order['cfid']) != len(con.cf.all()):
		return JsonResponse('Only %s ConstructFragments provided, %s required.' % (len(order['cfid']), len(con.cf.all())), ERROR)
	if len(order['direction']) != len(con.cf.all()):
		return JsonResponse('Only %s directions provided, %s required.' % (len(order['direction']), len(con.cf.all())), ERROR)
	
	if con:
		dirs = []
		for d in order['direction']:
			dirs.append(directions.get(d, ' '))
		con.reorder_cfragments(order['cfid'], dirs)
		return JsonResponse({'modified': con.last_modified(),});
	else:
		return HttpResponseNotFound()
