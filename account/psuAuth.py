'''
return {
    'uid': ['uid'],
    'givenName': ['firstname'],
    'sn': ['lastname']
    'email': ['email']
}
'''
import ldap

url = 'ldap://dirapps.aset.psu.edu'
searchBase = 'dc=psu, dc=edu'
searchScope = ldap.SCOPE_SUBTREE
searchFilter = 'uid=%s'

def psuAuth(username, password, retrieveAttributes=None):
    try:
        l = ldap.initialize(url)
        dn = 'uid=%s, %s' % (username, searchBase)
        l.simple_bind_s(dn, password)
        res = l.search_s(searchBase, searchScope, searchFilter % username, retrieveAttributes)
        for dn, entry in res:
            return res[0][1]
    except ldap.INVALID_CREDENTIALS:
        return {"error": "Invalid credentials"}
    except Exception as e:
        return {"error": "Authentication failed"}
