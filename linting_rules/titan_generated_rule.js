
/**
 * TITAN-O Anti-Pattern Linter Rule v1.0
 * 🎯 هدف: جلوگیری از ایجاد مشکلات تخصیص پرداخت مشابه 
 * 
 * این قانون موارد زیر را شناسایی و گزارش می‌کند:
 * 1. ایجاد رکورد پرداخت جدید بدون تنظیم isAllocated
 * 2. بروزرسانی payment بدون مدیریت صحیح وضعیت allocation  
 * 3. تخصیص پرداخت بدون حفظ یکپارچگی داده‌ها
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'جلوگیری از anti-pattern های تخصیص پرداخت',
      category: 'Business Logic',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },

  create: function(context) {
    return {
      // Rule 1: شناسایی insert payment بدون isAllocated
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.object &&
          node.callee.object.name === 'payments' &&
          node.callee.property &&
          node.callee.property.name === 'insert'
        ) {
          const valuesArg = node.arguments[0];
          if (valuesArg && valuesArg.type === 'ObjectExpression') {
            const hasIsAllocated = valuesArg.properties.some(prop => 
              prop.key && prop.key.name === 'isAllocated'
            );
            
            if (!hasIsAllocated) {
              context.report({
                node,
                message: 'TITAN-O: Payment insert باید شامل فیلد isAllocated باشد',
                fix(fixer) {
                  const lastProp = valuesArg.properties[valuesArg.properties.length - 1];
                  return fixer.insertTextAfter(lastProp, ', isAllocated: false');
                }
              });
            }
          }
        }
      },

      // Rule 2: شناسایی update payment در تخصیص
      'CallExpression[callee.property.name="update"]'(node) {
        if (
          node.callee.object &&
          node.callee.object.name === 'payments'
        ) {
          const setArg = node.arguments && node.arguments.find(arg => 
            arg.type === 'ObjectExpression' && 
            arg.properties.some(prop => prop.key && prop.key.name === 'invoiceId')
          );

          if (setArg) {
            const hasIsAllocated = setArg.properties.some(prop => 
              prop.key && prop.key.name === 'isAllocated'
            );

            if (!hasIsAllocated) {
              context.report({
                node,
                message: 'TITAN-O: Payment update با invoiceId باید شامل isAllocated: true باشد',
                fix(fixer) {
                  const invoiceIdProp = setArg.properties.find(prop => 
                    prop.key && prop.key.name === 'invoiceId'
                  );
                  return fixer.insertTextAfter(invoiceIdProp, ', isAllocated: true');
                }
              });
            }
          }
        }
      },

      // Rule 3: شناسایی عدم استفاده از transaction در تخصیص
      'FunctionDeclaration[id.name=/.*[Aa]llocat.*/]'(node) {
        let hasTransaction = false;
        
        node.body.body.forEach(statement => {
          if (
            statement.type === 'ReturnStatement' &&
            statement.argument &&
            statement.argument.type === 'AwaitExpression' &&
            statement.argument.argument &&
            statement.argument.argument.callee &&
            statement.argument.argument.callee.property &&
            statement.argument.argument.callee.property.name === 'transaction'
          ) {
            hasTransaction = true;
          }
        });

        if (!hasTransaction) {
          context.report({
            node,
            message: 'TITAN-O: توابع تخصیص پرداخت باید از db.transaction استفاده کنند',
          });
        }
      }
    };
  },
};
