#!/usr/bin/env python3
"""
Simple script to create Lambda ZIP files for manual upload.
This only creates the ZIP files - you upload them to S3 manually.
"""

import zipfile
from pathlib import Path

# Lambda function mappings: {zip_filename: source_file_path}
LAMBDA_FUNCTIONS = {
    'receive-submission.zip': 'Lambdas_Source_Code/ReceiveSubmission.py',
    'invoke-fargate.zip': 'Lambdas_Source_Code/InvokeFargate.py',
    'relay-results.zip': '../RelayResultsWebsocket.py',  # In root directory
    'websocket-handler.zip': '../WebSocketHandler.py',  # In root directory
    'cognito-post-confirmation.zip': 'Lambdas_Source_Code/CognitoPostConfirmation.py'
}

def create_lambda_zip(source_file, output_zip):
    """
    Create a ZIP file with the source file renamed to index.py inside.
    
    Args:
        source_file: Path to the Python source file
        output_zip: Path where the ZIP file should be created
    """
    source_path = Path(source_file)
    
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_file}")
    
    # Create ZIP file
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add the Python file with the name 'index.py' inside the ZIP
        # This is what Lambda expects (handler: index.lambda_handler)
        zipf.write(source_path, 'index.py')
    
    print(f"✓ Created {output_zip} from {source_file}")

def main():
    script_dir = Path(__file__).parent
    output_dir = script_dir / 'lambda_packages'
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Creating Lambda ZIP files for manual upload")
    print("=" * 60)
    print()
    
    for zip_filename, source_file in LAMBDA_FUNCTIONS.items():
        # Resolve source file path relative to script directory
        source_path = (script_dir / source_file).resolve()
        zip_path = output_dir / zip_filename
        
        print(f"Creating {zip_filename}...")
        create_lambda_zip(source_path, zip_path)
    
    print()
    print("=" * 60)
    print(f"✓ Successfully created {len(LAMBDA_FUNCTIONS)} ZIP files")
    print(f"  Location: {output_dir}")
    print()
    print("Next steps:")
    print("  1. Upload these ZIP files to S3:")
    print("     Bucket: cftemplates346225466066us-east-2")
    print("     Prefix: lambda-functions/")
    print()
    print("  2. Files to upload (upload each file individually, not the folder):")
    for zip_filename in LAMBDA_FUNCTIONS.keys():
        print(f"     - lambda-functions/{zip_filename}")
    print()
    print("     ⚠ IMPORTANT: Upload files to 'lambda-functions/' folder, not 'lambda_packages/'")
    print("     If you uploaded to lambda_packages/, either:")
    print("     - Move files in S3 to lambda-functions/ folder, OR")
    print("     - Set LambdaCodeS3KeyPrefix parameter to 'lambda_packages/' when deploying")
    print()
    print("  3. You can upload via AWS Console or CLI:")
    print("     aws s3 cp lambda_packages/ s3://cftemplates346225466066us-east-2/lambda-functions/ --recursive")

if __name__ == '__main__':
    main()

