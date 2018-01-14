#!/usr/bin/python2

import sys
reload(sys)
sys.setdefaultencoding('utf-8')

import argparse
import requests
from requests.auth import HTTPBasicAuth
import json
import random


def generate_invoice_record(record_number, record_owner):
    data = {}

    isPaid = random.choice([False, True])
    data["assoc_alvexreg_invoiceDocumentManager_added"] = available_people[record_owner]
    data["assoc_alvexreg_invoiceDocumentManager_removed"] = ""
    data["assoc_alvexreg_invoiceLinkedDocuments_added"] = ""
    data["assoc_alvexreg_invoiceLinkedDocuments_removed"] = ""
    data["assoc_alvexreg_files_added"] = ""
    data["assoc_alvexreg_files_removed"] = ""
    data["prop_alvexreg_invoiceDate"] = "2018-01-01"
    data["prop_alvexreg_invoicePaymentDate"] = "2018-01-%d" % random.randint(1, 14) if isPaid else ""
    data["prop_alvexreg_invoiceExpiryDate"] = "2018-02-01"
    data["prop_alvexreg_invoiceContractor"] = "Customer %06d" % record_number
    data["prop_alvexreg_invoiceSummary"] = "Monthly bill for Customer %06d for January 2018" % record_number
    data["prop_alvexreg_invoiceCurrency"] = "EUR"
    data["prop_alvexreg_invoiceAmount"] = "%d.%d" % (random.randint(50, 200), random.randint(0, 99))
    data["prop_alvexreg_invoiceIsPaid"] = isPaid
    return data


def generate_record(data_type, record_number, owner):
    if "alvexreg:invoice" == data_type:
        return generate_invoice_record(record_number, owner)
    else:
        raise Exception("Unknown data type: %s" % data_type)


parser = argparse.ArgumentParser(description='Test data generator')
parser.add_argument('-r', '--repo', required=False, default="http://localhost:8080/alfresco", help='Repo base URL, format: http://server.lan:8888/alfresco')
parser.add_argument('-a', '--admin', required=False, default="admin:admin", help='Credentials, format login:password')
parser.add_argument('-g', '--register', required=False, default="new", help='Target register UUID')
parser.add_argument('-u', '--users', required=False, default="abeecher,mjackson", help='Non-admin users who will own created records')
parser.add_argument('-p', '--password', required=False, default="qwe123#", help='Password to be set for non-admin users')
parser.add_argument('-c', '--count', type=int, required=True, help='Number of records to create in the register')
args = parser.parse_args()

admin_login = args.admin.split(':')[0]
admin_password = args.admin.split(':')[1]
admin_auth = HTTPBasicAuth(admin_login, admin_password)
headers = {'Content-Type': 'application/json'}

users = [u.strip() for u in args.users.split(',')]
for user in users:
    print("Enabling user %s" % user)
    user_edit_url = args.repo + "/s/api/people/" + user
    change_pass_url = args.repo + "/s/api/person/changepassword/" + user
    requests.put(user_edit_url, data=json.dumps({"disableAccount": False}), auth=admin_auth, headers=headers)
    requests.post(change_pass_url, data=json.dumps({"newpw": args.password}), auth=admin_auth, headers=headers)

people_url = args.repo + "/s/api/forms/picker/authority/children?searchTerm=*&selectableType=cm:person&size=1000"

available_people = {}
people_data = requests.get(people_url, auth=admin_auth)

for person in people_data.json()["data"]["items"]:
    for user in users:
        if "(%s)" % user in person["name"]:
            available_people[user] = (person["nodeRef"])

if args.register == "new":
    container_url = args.repo + "/s/slingshot/doclib2/doclist/all/site/swsdp/registers"
    container_ref = requests.get(container_url, auth=admin_auth).json()["metadata"]["container"]
    register_create_url = args.repo + ("/s/api/type/%s/formprocessor" % "alvexreg:register")
    resp = requests.post(register_create_url, data=json.dumps({
        "alf_destination": container_ref,
        "prop_alvexreg_registerItemType": "alvexreg:invoice",
        "prop_cm_description": "Load Test Register",
        "prop_cm_title": "Load Test Register",
    }), auth=admin_auth, headers=headers)
    register_uuid = resp.json()["persistedObject"].split('/')[-1]
    print("Created new register for testing with uuid %s" % register_uuid)
else:
    register_uuid = args.register

register_url = args.repo + ("/s/api/alvex/registers/%s/items?pageSize=25&startIndex=0" % register_uuid)
register_data_type = requests.get(register_url, auth=admin_auth).json()["type"]
create_url = args.repo + ("/s/api/type/%s/formprocessor" % register_data_type)

for number in range(0, args.count):
    user = random.choice(available_people.keys())
    user_auth = HTTPBasicAuth(user, args.password)
    record = generate_record(register_data_type, number + 1, user)
    record["prop_alvexreg_id"] = str(number + 1)
    record["alf_destination"] = "workspace://SpacesStore/%s" % register_uuid
    resp = requests.post(create_url, data=json.dumps(record), auth=user_auth, headers=headers)
    if resp.status_code == requests.codes.ok:
        # print("Import ok for %d records" % len(objects))
        pass
    elif resp.status_code == requests.codes.unauthorized:
        print("Response code %d. Incorrect auth info %s" % (resp.status_code, user))
        exit(-1)
    elif resp.status_code == requests.codes.forbidden:
        print("Response code %d. Insufficient access for user %s" % (resp.status_code, user))
        exit(-1)
    else:
        print("Something went wrong. Code %d. Response: %s" %(resp.status_code, resp.text))
        exit(-1)
    print("Created record %d from %d" % (number + 1, args.count))

register_total = requests.get(register_url, auth=admin_auth).json()["paging"]["total"]
print("Done. Register contains %d records now" % register_total)