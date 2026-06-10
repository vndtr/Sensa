# config file for data in models.Role
from sqlalchemy.ext.asyncio import  AsyncSession
from sqlalchemy import select, insert
import models


# создаем роли
async def fill_role_model(db:AsyncSession):
    result = await db.execute(select(models.Role))
    roles = result.scalars().all()

    if not roles:
        # INSERT через db.execute()
        stmt = insert(models.Role).values([            
            {"name": "user"},
            {"name": "admin"}
        ])
        await db.execute(stmt)
        await db.commit()
