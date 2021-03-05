import sys
import boto3
import json
import shutil
from datetime import datetime, timedelta
import configparser

# total - 5 steps, 2 main process
# start
print('=================================================================================================================')

# initialize env varaibles
ini_config = configparser.ConfigParser()
ini_config.read('config.ini')
CREDENTIAL_FILE_PATH = ini_config['config']['credential_file']
ROLE_ARN = ini_config['config']['role_arn']
MFA_SERIAL = ini_config['config']['mfa_serial']
MFA_OTP = sys.argv[1]
aws_config = configparser.ConfigParser()


aws_config.read(CREDENTIAL_FILE_PATH)

def error_message(error_str):
    print(error_str)
    print('=================================================================================================================')
    sys.exit()

# step 1 - validate default profile set
ORIGINAL_ACCESS_KEY = ""
ORIGINAL_SECRET_ACCESS_KEY = ""
def check_sections_profile(profiles):
    global ORIGINAL_ACCESS_KEY, ORIGINAL_SECRET_ACCESS_KEY
    if len(profiles) > 0:
            ORIGINAL_ACCESS_KEY = aws_config['encounter-users']['aws_access_key_id']
            ORIGINAL_SECRET_ACCESS_KEY = aws_config['encounter-users']['aws_secret_access_key']
    else:
        error_message("Profile [encounter-users] settings are not correct ::: Please check the path in config.ini or check ~/.aws/credentials")


check_sections_profile(aws_config.sections())

IS_DEBUG_MODE = "N"


def check_debug_mode():
    global IS_DEBUG_MODE
    if len(sys.argv) > 2:
        IS_DEBUG_MODE = str(sys.argv[2])


check_debug_mode()


# step 2 - To take backup if running in debug mode
def take_backup_old_file():
    shutil.copyfile(CREDENTIAL_FILE_PATH, CREDENTIAL_FILE_PATH + '-bkp')


if IS_DEBUG_MODE.upper() == 'Y':
    take_backup_old_file()


# step 3 - To fetch new token
def fetch_new_token():
    print('process 1 - Fetch new token from AWS')
    session = boto3.session.Session(
        profile_name='encounter-users')
    client = session.client('sts')
    new_credentials_resp = client.assume_role(
        RoleArn=ROLE_ARN,
        RoleSessionName='AWSCLI-Session',
        DurationSeconds=43200,
        SerialNumber=MFA_SERIAL,
        TokenCode=MFA_OTP
    )
    new_resp_pretty_json = json.dumps(new_credentials_resp, indent=4, sort_keys=True, default=str)
    new_resp_load_json = json.loads(new_resp_pretty_json)
    if IS_DEBUG_MODE.upper() == 'Y':
        print(new_resp_pretty_json)
    return new_resp_load_json


newAwsResponse = fetch_new_token()


# step 4 - To write new token to ~/.aws/credentials
def write_new_token():
    NEW_ACCESS_KEY = newAwsResponse["Credentials"]["AccessKeyId"]
    NEW_SECRET_ACCESS_KEY = newAwsResponse["Credentials"]["SecretAccessKey"]
    NEW_SESSION_TOKEN = newAwsResponse["Credentials"]["SessionToken"]
    credential_file = open(CREDENTIAL_FILE_PATH, 'r+')
    new_file_content = ["[encounter-users]\n",
                      "aws_access_key_id = {}\n".format(ORIGINAL_ACCESS_KEY),
                      "aws_secret_access_key = {}\n".format(ORIGINAL_SECRET_ACCESS_KEY),
                      "\n"
                      "[default]\n",
                      "aws_access_key_id = {}\n".format(NEW_ACCESS_KEY),
                      "aws_secret_access_key = {}\n".format(NEW_SECRET_ACCESS_KEY),
                      "aws_session_token = {}".format(NEW_SESSION_TOKEN)]
    print('process 2 - Update new credentials to {}'.format(CREDENTIAL_FILE_PATH))
    credential_file.writelines(new_file_content)


write_new_token()


# step 5 - To covert expiration_time_zone
def convert_expiration_time_zone():
    expiration_time = datetime.strptime(newAwsResponse["Credentials"]["Expiration"], '%Y-%m-%d %H:%M:%S+00:00')
    sgt_now = expiration_time + timedelta(hours=8)
    print('Note : New credentials will expire at {}'.format(sgt_now.strftime("%d/%m/%Y, %I:%M:%S %p")))


convert_expiration_time_zone()


# end
print('=================================================================================================================')
