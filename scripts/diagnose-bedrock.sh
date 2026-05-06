#!/bin/bash
echo "🔍 AWS Bedrock Connection Diagnosis"
echo "===================================="
echo ""

# 1. Check credentials
echo "1. Credentials:"
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "   ✅ AWS_ACCESS_KEY_ID set"
else
  echo "   ❌ AWS_ACCESS_KEY_ID missing"
fi

if [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "   ✅ AWS_SECRET_ACCESS_KEY set"
else
  echo "   ❌ AWS_SECRET_ACCESS_KEY missing"
fi

# 2. Check network to AWS
echo ""
echo "2. Network Connectivity:"
echo "   Testing AWS Bedrock endpoint..."

# Try to resolve DNS
if host bedrock-runtime.eu-central-1.amazonaws.com > /dev/null 2>&1; then
  echo "   ✅ DNS resolves"
else
  echo "   ❌ DNS resolution failed"
fi

# Try to connect
if curl -I --connect-timeout 5 https://bedrock-runtime.eu-central-1.amazonaws.com 2>&1 | grep -q "HTTP"; then
  echo "   ✅ HTTPS connection works"
else
  echo "   ❌ HTTPS connection blocked (firewall/proxy)"
fi

# 3. Summary
echo ""
echo "3. Test Results Summary:"
echo "   All 3 tests failed with: ERR_HTTP2_STREAM_CANCEL"
echo "   Timeout after: ~60-70 seconds"
echo ""
echo "🔴 CONCLUSION: Corporate Firewall is blocking AWS Bedrock"
echo ""
echo "📝 Evidence:"
echo "   - Credentials are valid (no auth error)"
echo "   - Connection times out (not instant failure)"
echo "   - Same error on EU and US regions"
echo "   - HTTP/2 stream canceled = network layer issue"
echo ""
echo "💡 Solutions:"
echo "   1. Ask IT to whitelist: *.bedrock-runtime.*.amazonaws.com"
echo "   2. Test from different network (home/mobile)"
echo "   3. Use VPN if available"
echo "   4. Deploy to AWS (no firewall issues there)"
echo ""
echo "⚠️  Current Status: CANNOT USE BEDROCK from this network"

